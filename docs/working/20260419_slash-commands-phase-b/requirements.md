# 要件定義書 - Claude Code スラッシュコマンドサジェスト統合 Phase B

## 概要

Phase A で実装した `SlashSuggest`（組み込みコマンド + バンドル Skill + ユーザーテンプレート）に、**ユーザー Skill**（`~/.claude/skills/<name>/SKILL.md`）と **プロジェクト Skill**（`<projectRoot>/.claude/skills/<name>/SKILL.md`）のファイルスキャン結果を候補として追加する。

Rust の `list_claude_skills` コマンドを新設し、`SKILL.md` の YAML frontmatter をパースして `SkillMetadata` を返す。フロントエンドはパレット初回オープン時に非同期ロードし、`promptPaletteStore.skills` に runtime キャッシュする。

## 背景・目的

### 現状の課題

- Phase A の時点では Claude Code 本体の組み込み機能のみ候補化され、ユーザーが個別に定義した Skill（`~/.claude/skills/`）やプロジェクト固有の Skill（`<projectRoot>/.claude/skills/`）はサジェストに出てこない
- ユーザー定義 Skill は Claude Code 上で最も頻繁に使う機能の一つで、これが拾えないことは UX 上の大きな欠落
- steering `docs/steering/features/prompt-palette.md` v1.2 PE-46 に「`user-skill` / `project-skill` は Phase B で有効化予定」と記載済み

### 狙い

- SpecPrompt 上で `/` を打つだけで、Claude Code の **全**コマンド（本体 + バンドル + 個別 + プロジェクト）を発見・挿入できる状態にする
- Phase A の型基盤（`SlashSuggestItem` の `user-skill` / `project-skill`）を実値で埋め、UI 改修を最小差分で完了させる
- 外部 CLI 呼び出しや常駐プロセス監視は避け、**パレット初回オープン時の 1 回スキャン + runtime キャッシュ** で軽量に実現する

## 要件一覧

### 機能要件

#### F-1: Rust `list_claude_skills` コマンド

- **説明**: `~/.claude/skills/<name>/SKILL.md` と `<projectRoot>/.claude/skills/<name>/SKILL.md` を列挙し、YAML frontmatter をパースして `SkillMetadata[]` を返す Tauri コマンドを新設する
- **受け入れ条件**:
  - [ ] コマンド名は `list_claude_skills`、引数は `project_root: Option<String>`
  - [ ] 戻り値は `Result<Vec<SkillMetadata>, String>`
  - [ ] `~` は `dirs::home_dir()` で OS 非依存に展開（macOS/Linux: `$HOME`、Windows: `%USERPROFILE%`）
  - [ ] ユーザー側とプロジェクト側の両方をスキャンする
  - [ ] `SKILL.md` が存在しないサブディレクトリは警告ログで記録しスキップ
  - [ ] YAML パース失敗は当該エントリのみスキップ（他は継続）
  - [ ] `~/.claude/skills/` 自体が存在しない場合は `Ok(vec![])` を返す（正常系）

#### F-2: SKILL.md frontmatter パース

- **説明**: `serde_yaml` で YAML frontmatter を読み取り、必要フィールドを取得する
- **受け入れ条件**:
  - [ ] 対象フィールド: `name`, `description`, `argument-hint`, `user-invocable`, `disable-model-invocation`
  - [ ] `user-invocable: false` のスキルは候補から除外（Claude 自動呼び出し専用のため）
  - [ ] `disable-model-invocation: true` は手動発動対象としてそのまま含める
  - [ ] `name` が frontmatter に無い場合はディレクトリ名を採用
  - [ ] 他の未知フィールドは読み飛ばす（将来拡張互換）

#### F-3: 同名衝突解決

- **説明**: ユーザー側とプロジェクト側に同名 Skill がある場合、**ユーザー側を優先**し、プロジェクト側は重複として除外する
- **受け入れ条件**:
  - [ ] Rust 側で重複を検出し、プロジェクト側の同名エントリを結果から除外
  - [ ] 結果は kind (`user` / `project`) タグ付きで返す
  - [ ] フロントの `getSlashSuggestCandidates`（Phase A 実装）が引数として受け取ってもそのまま正しく動く

#### F-4: `tauriApi.listSkills` wrapper

- **説明**: フロントエンドから `invoke('list_claude_skills', { projectRoot })` を呼ぶための wrapper を `src/lib/tauriApi.ts` に追加する
- **受け入れ条件**:
  - [ ] `listSkills(projectRoot?: string): Promise<SkillMetadata[]>` の型が明確
  - [ ] 既存 `tauriApi` の命名規則（camelCase）に従う
  - [ ] `SkillMetadata` 型は `src/lib/slashSuggestItem.ts`（Phase A で先行定義済み）を再利用

#### F-5: Skill runtime キャッシュ

- **説明**: `promptPaletteStore` に `skills: SkillMetadata[]` と `skillsLoadedAt: number | null` を追加し、パレット初回オープン時に非同期ロードする
- **受け入れ条件**:
  - [ ] `skills` と `skillsLoadedAt` は Zustand `partialize` で localStorage 永続化対象から除外
  - [ ] `loadSkills(projectRoot?)` アクションを追加
  - [ ] `PromptPalette` の useEffect で `isOpen && skillsLoadedAt === null` なら `loadSkills` を起動
  - [ ] 2 回目以降のパレットオープンは IPC を呼ばず即座に候補を表示（キャッシュヒット）

#### F-6: SlashSuggest への Skill セクション追加

- **説明**: `SlashSuggest` は Phase A で既に `user-skill` / `project-skill` セクションを型・UI 両面で用意済み。Phase B では store の `skills` を `getSlashSuggestCandidates` へ渡すだけで有効化できる
- **受け入れ条件**:
  - [ ] `user-skill` セクション見出し（`User Skills` / `ユーザー Skill`）が表示される
  - [ ] `project-skill` セクション見出し（`Project Skills` / `プロジェクト Skill`）が表示される
  - [ ] バッジは `USER` / `PROJ`
  - [ ] キー操作（↑/↓/Enter/Tab）が 4 セクション横断で機能する
  - [ ] Skill 選択時に `/<name> ` が draft に挿入される（Phase A の `insertInlineCommand` 流用）

#### F-7: エラーハンドリング

- **説明**: IPC 失敗時に toast でユーザーに通知し、静的リストのみのフォールバックで継続動作する
- **受け入れ条件**:
  - [ ] IPC 失敗時に `toast.error` を発火
  - [ ] `skills` は `[]` のまま維持され、`skillsLoadedAt` も `null` のまま（次回オープンで再試行可能）
  - [ ] Phase A 相当の体験（組み込み + テンプレ）は維持される

### 非機能要件

- **パフォーマンス**: 初回ロードは Skill 100 件以下で **200ms 以内**。キャッシュヒット時は 0ms
- **ユーザビリティ**: アプリ起動直後は待たず、`/` を打った段階で組み込みは即表示、Skill は遅延でも体感上問題ない
- **保守性**: SKILL.md の未知 frontmatter フィールドは読み飛ばす構造で将来拡張に対応
- **セキュリティ**: スキャン対象パスは **Rust 側で固定**。ユーザー入力でパスを任意指定できない構造
- **外観・デザイン**: Phase A で整備した `USER` / `PROJ` バッジ・セクション見出しをそのまま利用

## スコープ

### 対象

- Rust `list_claude_skills` コマンドの実装
- `serde_yaml` 依存追加
- SKILL.md frontmatter パース（name / description / argument-hint / user-invocable / disable-model-invocation）
- ユーザー Skill 優先の同名衝突解決
- `tauriApi.listSkills` wrapper
- `promptPaletteStore` への `skills` / `skillsLoadedAt` / `loadSkills` 追加
- `PromptPalette` の初回オープン時ロードトリガー
- `SlashSuggest` からの store 経由での候補取得
- Rust 側単体テスト（tempdir フィクスチャ）
- フロント側単体テスト（store キャッシュ動作）
- 手動動作確認

### 対象外

- **Phase C（プラグイン Skill）**: `<plugin>/skills/<name>/SKILL.md` の `/plugin-name:name` 形式は **ニーズが高まってから**着手する（今フェーズには含まない）
- **MCP プロンプト**: `/mcp__<server>__<prompt>` 形式は恒久スコープ外
- **Skill の実行時引数入力 UI**: `argument-hint` を表示するのみで、構造化入力フォームは作らない
- **Skill body のプレビュー**: 候補行に description のみ表示、SKILL.md 本文のレンダリングなし
- **Skill のライブリロード**: ファイル監視で自動反映せず、パレット再オープンで再スキャンする運用（明示的なリロードボタンも v1.3 以降）
- **Skill エディタ**: SpecPrompt 上で SKILL.md を作成・編集する UI なし

## 実装対象ファイル（予定）

- `src-tauri/Cargo.toml` — `serde_yaml = "0.9"`、`dirs = "5"` 追加
- `src-tauri/src/commands/skills.rs` — 新規（`list_claude_skills`）
- `src-tauri/src/commands/mod.rs`（もしくは `lib.rs`）— `pub mod skills;` と invoke_handler 登録
- `src-tauri/src/lib.rs`（または `main.rs`）— `.invoke_handler(generate_handler![..., list_claude_skills])`
- `src/lib/tauriApi.ts` — `listSkills` wrapper 追加
- `src/stores/promptPaletteStore.ts` — `skills` / `skillsLoadedAt` / `loadSkills` 追加、`partialize` で除外
- `src/stores/promptPaletteStore.test.ts` — キャッシュ動作テスト追加
- `src/components/PromptPalette/PromptPalette.tsx` — `useEffect` で初回オープン時の `loadSkills` トリガー
- `src/components/PromptPalette/SlashSuggest.tsx` — store の `skills` を読み、`userSkills` / `projectSkills` に振り分けて `getSlashSuggestCandidates` に渡す
- `src/components/PromptPalette/SlashSuggest.test.tsx` — 2 セクション追加の回帰カバー

## 依存関係

- **Phase A 完了必須**: `SlashSuggestItem` の `user-skill` / `project-skill` 型、`getSlashSuggestCandidates` の衝突解決ロジック、`SlashSuggest` UI（セクション/バッジ/キー委譲/オーバーフロー抑止）が Phase A で実装済みであることが前提
- Rust 側 `dirs` クレート（5.x）に新規依存
- Rust 側 `serde_yaml` クレート（0.9.x）に新規依存

## 既知の制約

- **Skill のライブリロード非対応**: ユーザーが SKILL.md を追加・更新してもパレットを一度閉じて再度開かないと反映されない。本 Phase ではスコープ外
- **プロジェクトルート解決**: `<projectRoot>` は `appStore` のアクティブプロジェクトパスを使用する。複数ウィンドウ・プロジェクト切替時は再スキャンのタイミング設計が必要
- **Windows の `USERPROFILE`**: `dirs::home_dir()` が内部で処理するため問題ないはずだが、手動テスト範囲は macOS のみ（CI 非対応）
- **Skill の body 表示**: 候補リストでは `description` のみ表示。`argument-hint` は将来 UI 拡張で表示予定（現状はデータ取得のみ）
- **パフォーマンス境界**: Skill 1,000 件以上の環境は想定外。500 件程度までは 200ms 以内を満たす想定

## 参考資料

- `docs/steering/features/prompt-palette.md` v1.2 — PE-46 / PE-47 / PE-48
- `docs/projects/20260419-claude-code-slash-commands/01_要件定義書.md` — FR-03 / FR-04 / FR-05（Phase B 相当）
- `docs/projects/20260419-claude-code-slash-commands/02_概要設計書.md` — 3.2 Phase B データフロー、5.2 Rust 型定義
- `docs/projects/20260419-claude-code-slash-commands/03_WBS.md` — TB-1〜TB-10
- `docs/working/20260419_slash-commands-phase-a/` — Phase A 実装・型基盤
- Claude Code Skills 公式: https://code.claude.com/docs/en/skills.md
