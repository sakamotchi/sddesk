# タスクリスト - Claude Code スラッシュコマンドサジェスト統合 Phase B

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 10 |
| 進行中 | 0 |
| 未着手 | 0 |

WBS 上の `TB-1`〜`TB-10` と 1:1 対応。実装確認完了 2026-04-19。

## タスク一覧

### T-1（WBS: TB-1）: Rust 依存追加

- [x] `src-tauri/Cargo.toml` に `serde_yaml = "0.9"` を追加
- [x] `src-tauri/Cargo.toml` に `dirs = "5"` を追加
- [x] `cd src-tauri && cargo build` で lock 更新・ビルド成功
- [x] バイナリサイズ増（実測目安 300KB 以下）を確認

### T-2（WBS: TB-2）: `list_claude_skills` 実装

- [x] `src-tauri/src/commands/skills.rs` を新規作成
- [x] `SkillKind` (user/project) enum・`SkillMetadata` struct・`SkillFrontmatter` 内部 struct を定義
- [x] `scan_skills_dir(dir, kind)` 関数で SKILL.md を列挙・frontmatter 抽出
- [x] `read_frontmatter(path)` 関数で `---` 区切りを抽出し `serde_yaml::from_str` でパース
- [x] `user-invocable: false` のスキルを除外
- [x] ユーザー側優先で同名衝突を除外
- [x] frontmatter に `name` が無い場合はディレクトリ名を採用
- [x] broken YAML はそのエントリのみスキップ、`log::warn!` で記録
- [x] `~/.claude/skills/` が存在しない場合は `Ok(vec![])` で返す

### T-3（WBS: TB-3）: invoke_handler 登録

- [x] `src-tauri/src/commands/mod.rs`（または同等）に `pub mod skills;` を追加
- [x] `src-tauri/src/lib.rs`（または `main.rs`）の `.invoke_handler(generate_handler![...])` に `list_claude_skills` を追加
- [x] `cargo check` でエラーなし

### T-4（WBS: TB-4）: Rust 単体テスト

- [x] `src-tauri/src/commands/skills.rs` の末尾に `#[cfg(test)] mod tests` を追加
- [x] ヘルパ `write_skill(dir, name, frontmatter)` を用意
- [x] **reads_user_skills_only**: ユーザー側のみ列挙
- [x] **merges_user_and_project_skills**: ユーザー + プロジェクトの両方が返る
- [x] **resolves_name_collision_user_wins**: 同名衝突はユーザー優先
- [x] **excludes_non_user_invocable**: `user-invocable: false` を除外
- [x] **handles_missing_directory**: スキル dir 無しは空配列
- [x] **skips_broken_yaml**: broken YAML はその他を継続
- [x] **uses_directory_name_when_frontmatter_has_no_name**: frontmatter に name 無しならディレクトリ名
- [x] `cargo test` すべてグリーン。並列実行で `HOME` 干渉が出た場合は `-- --test-threads=1` で実施

### T-5（WBS: TB-5）: `tauriApi.listSkills` wrapper

- [x] `src/lib/tauriApi.ts` の `tauriApi` オブジェクトに `listSkills` を追加
- [x] 引数: `projectRoot?: string` → `invoke<SkillMetadata[]>('list_claude_skills', { projectRoot })`
- [x] 戻り値型は `SkillMetadata[]`（`src/lib/slashSuggestItem.ts` を import）
- [x] `tauriApi` の TypeScript 型に追加

### T-6（WBS: TB-6）: `promptPaletteStore` 拡張

- [x] `PromptPaletteState` に `skills: SkillMetadata[]` と `skillsLoadedAt: number | null` を追加
- [x] `loadSkills(projectRoot?)` アクションを追加（async）
  - 成功時: `{ skills, skillsLoadedAt: Date.now() }` に更新
  - 失敗時: toast.error を発火し、`skills`=[], `skillsLoadedAt`=null を維持
- [x] 初期値 `skills: [], skillsLoadedAt: null`
- [x] `partialize` の対象から `skills` / `skillsLoadedAt` を除外
- [x] 既存テストが壊れないこと（`persist` の state ロード時に `skills` が初期値で入る）

### T-7（WBS: TB-7）: store 単体テスト

- [x] `src/stores/promptPaletteStore.test.ts`
  - [x] `loadSkills` 1 回目は IPC を呼び、`skillsLoadedAt` が更新される
  - [x] `loadSkills` 失敗時は `skillsLoadedAt` が null のまま（再試行可能）
  - [x] `skills` が永続化されない（localStorage キーに含まれない）

### T-8（WBS: TB-8）: PromptPalette の初回ロードトリガー

- [x] `src/components/PromptPalette/PromptPalette.tsx` に `useEffect` を追加
  - 依存配列: `[isOpen, skillsLoadedAt, activeProjectPath]`
  - 条件: `isOpen && skillsLoadedAt === null`
  - アクション: `loadSkills(activeProjectPath ?? undefined)`
- [x] `activeProjectPath` は `appStore` から取得（無ければ undefined）
- [x] テスト: パレットを open 状態で render すると IPC が 1 回呼ばれる

### T-9（WBS: TB-9）: SlashSuggest の候補ソース拡張

- [x] `src/components/PromptPalette/SlashSuggest.tsx` で `usePromptPaletteStore((s) => s.skills)` を購読
- [x] `userSkills` / `projectSkills` に `kind` で振り分け
- [x] `getSlashSuggestCandidates` の引数に渡す
- [x] テスト: 既存テストを破壊しない。Skill セクションが出る条件で回帰テスト追加

### T-10（WBS: TB-10）: Phase B 手動動作確認

- [x] `~/.claude/skills/test-user/SKILL.md` を作成（frontmatter: name, description）
- [x] `<projectRoot>/.claude/skills/test-project/SKILL.md` を作成
- [x] `npx tauri dev` で起動
- [x] `Cmd+Shift+P` でパレット → `/` 入力 → User Skills / Project Skills セクションが出る
- [x] 同名 Skill を両方に置いてユーザー側が優先されることを確認
- [x] `user-invocable: false` のスキルが候補に出ないことを確認
- [x] broken YAML ファイルがあっても他が出ることを確認（toast も表示されない正常系）
- [x] `testing.md` のテストケースを全件実施し、結果を記録

## 完了条件

- [x] 全 10 タスク完了
- [x] `npm run lint` / `npm run build` / `npm run test` すべてグリーン
- [x] `cd src-tauri && cargo test` グリーン（必要なら `-- --test-threads=1`）
- [x] `cd src-tauri && cargo check` エラーなし
- [x] `testing.md` の手動テストが全件 OK
- [x] `docs/steering/features/prompt-palette.md` の Phase B 実装済みステータスを v1.3 として更新
- [x] PR 作成（ユーザー承認後）

## ブランチ・コミット運用

- 作業ブランチ: `feature/claude-code-slash-commands`（Phase A と同じブランチを継続利用 or 別ブランチ起こし、運用時に判断）
- コミット粒度: 「Rust 実装 + テスト」「フロント wrapper + store」「UI 統合 + テスト」「ドキュメント更新」の 4 分割推奨
- スコープ: `feat(slash-suggest): ...`

## 備考

- Phase C（プラグイン Skill `<plugin>/skills/<name>/SKILL.md`、命名 `/plugin-name:name`）は **ニーズが高まってから**着手。本 WBS・本作業ドキュメントには含まれない
- 初版では Skill のライブリロード非対応。パレット再オープンで再スキャンする運用
- Skill が数百件ある環境での初回レイテンシは T-10 で実測し、200ms を超える場合は `rayon` 並列化を別タスクとして起こす
