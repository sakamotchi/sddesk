# タスクリスト - Claude Code スラッシュコマンドサジェスト統合 Phase A

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 9 |

WBS 上のタスク ID（`TA-1`〜`TA-9`）と 1:1 対応。

## タスク一覧

### T-1（WBS: TA-1）: `SlashSuggestItem` 型と合成関数の定義

- [ ] `src/lib/slashSuggestItem.ts` を新規作成
- [ ] `SlashSuggestKind` / `SlashSuggestItem` 判別共用体を定義（Phase B 用の `user-skill` / `project-skill` も含む）
- [ ] `SlashSuggestSection` インターフェースを定義
- [ ] `getSlashSuggestCandidates` 関数を実装（fuzzy + セクション合成 + maxPerSection + 空セクション除去）
- [ ] 同名衝突はユーザー優先で 1 件に絞るロジック（Phase B 用、Phase A は空配列なので実質 no-op）
- [ ] 型が通る（`npm run build`）

### T-2（WBS: TA-2）: 組み込み + バンドル Skill 静的リスト

- [ ] `src/lib/builtInCommands.ts` を新規作成
- [ ] `BuiltInCommand` 型 export
- [ ] 組み込みコマンド 23 件収録
- [ ] バンドル Skill 5 件収録（`debug` / `simplify` / `batch` / `loop` / `claude-api`）
- [ ] コメントで「2026-04 時点の公式 docs 準拠」と出典 URL を明記
- [ ] 名前重複がないことを unit test で担保（T-3 で）

### T-3（WBS: TA-3）: 合成関数・静的リストの単体テスト

- [ ] `src/lib/builtInCommands.test.ts` を新規作成
  - [ ] `name` の重複なし
  - [ ] 各エントリに空でない `description` がある
- [ ] `src/lib/slashSuggestItem.test.ts` を新規作成
  - [ ] 空クエリ時に builtin / template セクションの順で返る
  - [ ] fuzzy クエリで横断マッチ
  - [ ] `maxPerSection` の上限適用
  - [ ] 空セクションは結果から除外
  - [ ] query が `/` で始まる場合は除去して検索（`parseSlashQuery` が抽出した query がそのまま渡される前提で、合成関数自体は `/` を前提にしない）
- [ ] `npm run test` グリーン

### T-4（WBS: TA-4）: `SlashSuggest` コンポーネント改修

- [ ] 候補を `SlashSuggestSection[]` 受け取りに変更
- [ ] セクション見出しと `role="group"` でグルーピング
- [ ] 各行にバッジ（`CMD` / `TPL`）を表示
- [ ] `activeIndex` をセクション跨ぎのグローバル index で管理
- [ ] `↑` / `↓` / `Enter` の挙動を維持（既存の動作を壊さない）
- [ ] `onMouseEnter` で `activeIndex` 更新 / `onClick` で選択確定（既存踏襲）
- [ ] 候補 0 件（全セクション空）時の非表示挙動は現状維持

### T-5（WBS: TA-5）: `SlashSuggest` テスト更新

- [ ] `src/components/PromptPalette/SlashSuggest.test.tsx` を改修
- [ ] セクション見出しが描画されるテスト
- [ ] バッジテキスト（CMD/TPL）のテスト
- [ ] `↓` でセクション境界を越えるテスト
- [ ] 既存の fuzzy / Enter / 非表示テストが通ること（回帰チェック）

### T-6（WBS: TA-6）: `handleSlashSelect` kind 分岐

- [ ] `src/lib/templateApply.ts`（または新規ファイル）に `insertInlineCommand(name: string): void` を追加
  - draft を `/<name> ` に置換
  - caret を末尾に設定
- [ ] `src/components/PromptPalette/PromptPalette.tsx` の `handleSlashSelect` を `(item: SlashSuggestItem) => void` に変更
  - `kind === 'template'` → 既存 `applyTemplateBodyToDraft(item.body)`
  - `kind === 'builtin' | 'user-skill' | 'project-skill'` → `insertInlineCommand(item.name)`

### T-7（WBS: TA-7）: `PromptPalette` テスト更新

- [ ] `src/components/PromptPalette/PromptPalette.test.tsx`
  - [ ] 既存のテンプレ選択テストを `SlashSuggestItem` 化して継続動作
  - [ ] builtin 選択時に draft が `/<name> ` になる新規テスト
  - [ ] IME 変換中の Enter で誤挿入しないテスト（既存カバー確認）

### T-8（WBS: TA-8）: i18n リソース追加

- [ ] `src/i18n/locales/ja.json` / `en.json` に以下のキーを追加
  - `promptPalette.slashSuggest.section.commands` — ja: "コマンド" / en: "Commands"
  - `promptPalette.slashSuggest.section.templates` — ja: "テンプレート" / en: "Templates"
  - `promptPalette.slashSuggest.badge.command` — ja/en: "CMD"
  - `promptPalette.slashSuggest.badge.template` — ja/en: "TPL"
- [ ] 既存の `promptPalette.template.title` との重複がないこと

### T-9（WBS: TA-9）: Phase A 手動動作確認

- [ ] `npx tauri dev` でアプリ起動
- [ ] `Cmd+Shift+P` でパレットを開き、`/` を入力 → コマンドセクションが表示される
- [ ] `/rev` で `review` / `rewind` が絞り込まれる
- [ ] 既存のテンプレ（あれば）も同時表示される
- [ ] `↑`/`↓` でセクション跨ぎが機能する
- [ ] `Enter` で `/<name> ` が draft に挿入される（送信されないこと）
- [ ] 既存のテンプレ選択挙動に回帰なし
- [ ] `testing.md` の全ケースを実施し、結果を記録

## 完了条件

- [ ] 全 9 タスクが完了
- [ ] `npm run lint` エラーなし
- [ ] `npm run build` TypeScript エラーなし
- [ ] `npm run test` 全件グリーン
- [ ] `testing.md` の手動テストが全件 OK
- [ ] `docs/steering/features/prompt-palette.md` の PE-46 を「Phase A 実装済み」に更新（Phase B 残り）
- [ ] PR 作成（ユーザー承認後）

## ブランチ・コミット運用

- 作業ブランチ: `feature/claude-code-slash-commands`（既存）
- コミットは T-1〜T-3 / T-4〜T-5 / T-6〜T-8 / T-9 の単位で分割推奨
- `feat(slash-suggest): ...` のスコープでコミットメッセージを揃える
- マージは Phase A 完了時点で 1 PR（Phase B は別 PR）

## 備考

- Rust 変更なし → `cargo test` / `cargo check` のステップはこの Phase では省略可
- 本 Phase で Rust 側の変更が発生した場合は design.md に追記してから実装する
