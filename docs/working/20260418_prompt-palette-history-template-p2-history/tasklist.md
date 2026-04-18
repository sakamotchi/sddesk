# タスクリスト - prompt-palette-history-template-p2-history

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 6 |

## タスク一覧

### T2-1: 送信成功時の履歴 push

- [ ] `PromptPalette.tsx` の `handleSubmit` 成功ブロックで `pushHistory(body)` を呼ぶ（`clearDraft` より前）
- [ ] 送信失敗時（catch 節）は push しないことを確認
- [ ] `PromptPalette.test.tsx` に送信成功時 push テストを追加
- [ ] `PromptPalette.test.tsx` に送信失敗時非 push テストを追加
- [ ] `npm run test -- PromptPalette` がパス

### T2-2: usePromptHistoryCursor フック新規実装

- [ ] `src/hooks/usePromptHistoryCursor.ts` を新規作成
- [ ] 引数 `{ textareaRef, isComposing }` と戻り値 `{ handleArrowKey, resetCursor }` の型を定義
- [ ] `handleArrowKey` 内で以下を判定:
  - IME 変換中は発動しない（`isComposing` と `nativeEvent.isComposing` の OR）
  - 修飾キー（Shift/Alt/Meta/Ctrl）押下時は発動しない
  - `textarea.value` が空または履歴由来の値のみ発動
  - `↑` は `historyCursor` を +1（上限 `history.length - 1`）
  - `↓` は `historyCursor` を -1、0 未満で null・draft 空へ戻す
- [ ] 流し込み時に `setDraft` で drafts 更新 → textarea 末尾にキャレット移動
- [ ] `resetCursor()` で `setHistoryCursor(null)` を呼ぶユーティリティ
- [ ] `src/hooks/usePromptHistoryCursor.test.ts` を新規作成
- [ ] 以下のテスト追加:
  - `↑` で直近履歴が流し込まれる（空 textarea 前提）
  - IME 変換中は発動しない
  - 修飾キー付きは発動しない
  - textarea が空でないときは発動しない（ただし履歴由来の値は例外）
  - 最新より新しい側で `↓` を押すと空に戻る
  - 履歴 0 件では発動しない
- [ ] `npm run test -- usePromptHistoryCursor` がパス

### T2-3: PromptPalette.tsx への巡回ハンドラ統合

- [ ] `PromptPalette.tsx` で `usePromptHistoryCursor` を呼び出し
- [ ] `handleKeyDown` の先頭で `↑` / `↓` を処理（処理した場合は他のハンドラをスキップ）
- [ ] `handleChange` で `resetCursor()` を呼ぶ（ユーザー編集で巡回解除）
- [ ] 履歴巡回で流し込まれた直後はカーソル末尾に移動（既存 `scheduleCaretRestore` ロジックを参考、あるいは textarea.value 更新後の rAF で `setSelectionRange`）
- [ ] 既存の `⌘Enter` / `Ctrl+Enter` 送信が壊れないこと
- [ ] 既存の IME ガード（`isComposing` と `nativeEvent.isComposing`）が維持されること

### T2-4: 履歴ドロップダウン実装

- [ ] `src/components/PromptPalette/PromptHistoryDropdown.tsx` を新規作成
- [ ] ストア購読: `history`, `dropdown`, `targetPtyId`（プロンプトパレットストアのみ）
- [ ] 検索 input と結果リスト（`role="listbox"`）の構造
- [ ] 各行は 1 行プレビュー（80 字でトリム、改行は `↵` に変換）＋相対日時表示
- [ ] fuzzy フィルタ実装（`PathPalette.fuzzyMatch` と同等ロジック）
- [ ] `↑` / `↓` で `activeIndex` 更新、`Enter` で選択 → `setDraft` + `closeDropdown`
- [ ] `Esc` でドロップダウンのみ閉じる（パレットは開いたまま）
- [ ] 空状態メッセージ（`promptPalette.history.empty`）
- [ ] ルート DOM に `data-palette-dropdown="history"` 属性を付与
- [ ] `role="listbox"` と `aria-label="{promptPalette.history.ariaLabel}"` を設定
- [ ] 選択中行に `aria-selected="true"` とアクセントカラー
- [ ] `src/components/PromptPalette/PromptHistoryDropdown.test.tsx` を新規作成
- [ ] 以下のテスト追加:
  - 履歴 0 件で empty メッセージ
  - 検索で絞り込める
  - `Enter` 選択で draft 流し込み + `closeDropdown`
  - `Esc` でドロップダウンのみ閉じる
  - `↑` / `↓` で `activeIndex` が範囲内で動く
- [ ] `npm run test -- PromptHistoryDropdown` がパス

### T2-5: ヘッダアイコン + `⌘H` 導線

- [ ] `PromptPalette.tsx` のヘッダ右端に `lucide-react` の `History` アイコンボタンを追加
- [ ] `aria-label` と tooltip（title 属性 or Radix Tooltip）で「履歴を開く (⌘H)」を提示
- [ ] クリックで `openDropdown('history')` を呼ぶ（既に開いていればトグルで `closeDropdown()`）
- [ ] `handleKeyDown` で `⌘H`（macOS）/ `Ctrl+H`（Windows/Linux）を処理
- [ ] IME 変換中は処理しない（既存ガード流用）
- [ ] `PromptPalette.tsx` Dialog の `onPointerDownOutside` に `data-palette-dropdown` 例外判定を追加
- [ ] `src/lib/shortcuts.ts` に「パレット内: 履歴を開く (⌘H)」の表示用エントリを追加
- [ ] i18n に追加ラベル（必要なら）

### T2-F: 最終確認・コミット

- [ ] `npm run lint` 本変更分でエラーなし
- [ ] `npm run test` 全件 pass（既存 + 新規）
- [ ] `npm run build` 型エラーなし
- [ ] `testing.md` の手動確認ケースを実施
- [ ] ユーザーに確認を依頼してからコミット（CLAUDE.md 作業ルール）
- [ ] コミットメッセージ案: `feat(prompt-palette): 履歴機能の UI 統合（Phase 2）`
- [ ] 完了後、プロジェクトドキュメント `docs/projects/.../03_WBS.md` の Phase 2 タスクを `[x]` に更新

## 完了条件

- [ ] 全タスクが完了
- [ ] `npm run lint` がエラーなし（本変更分）
- [ ] `npm run test` が全件 pass
- [ ] `npm run build` が型エラーなし
- [ ] 手動テスト（送信・巡回・ドロップダウン・`⌘H`）が全件 OK
- [ ] 既存パレット UX（`⌘Enter` 送信・Esc クローズ・IME ガード・挿入フラッシュ）にリグレッションなし
- [ ] マイルストーン M2 達成: 「F4 → `↑` → `⌘Enter`」で直近プロンプト再送できる、履歴ドロップダウンから流し込みできる
