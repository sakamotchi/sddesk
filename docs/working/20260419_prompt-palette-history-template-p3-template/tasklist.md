# タスクリスト - prompt-palette-history-template-p3-template

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 7 |

## タスク一覧

### T3-1: テンプレートドロップダウン

- [ ] `src/components/PromptPalette/PromptTemplateDropdown.tsx` を新規作成
- [ ] ストア購読: `templates`, `dropdown`, `targetPtyId`
- [ ] 検索 input（`name` と `body` 両方で fuzzy）
- [ ] 行表示: 左 name（強調）+ 右 body 1 行プレビュー（40 字 + `↵`）
- [ ] `↑` / `↓` で `activeIndex` 更新、`Enter` で流し込み、`Esc` で dropdown 閉じる
- [ ] 行右端に「編集」「削除」アイコン（ホバー/選択中で表示）
- [ ] 「編集」→ `openEditor({ mode: 'edit', templateId })`
- [ ] 「削除」→ Radix `AlertDialog` 確認 → `removeTemplate(id)`
- [ ] 下部に「+ 新規作成」アクション（常時表示、クリックで `openEditor({ mode: 'create' })`）
- [ ] 0 件状態は empty メッセージ + 新規作成ボタン
- [ ] ルート DOM に `data-palette-dropdown="template"` 属性
- [ ] `role="listbox"` / `aria-selected` / `aria-label`
- [ ] 選択時: Phase 3-2 のプレースホルダ選択状態化を呼ぶ
- [ ] `src/components/PromptPalette/PromptTemplateDropdown.test.tsx` を新規作成
- [ ] テスト: 0 件 empty、一覧表示、name/body fuzzy、`Enter` 選択、行アクション（Edit/Delete）、新規作成ボタン
- [ ] `npm run test -- PromptTemplateDropdown` がパス

### T3-2: プレースホルダ選択状態化

- [ ] 共通関数 `applyTemplateBodyToDraft(ptyId, body)` を新設（`PromptTemplateDropdown.tsx` 内部または `src/lib/templatePlaceholders.ts` の補助関数）
- [ ] `setDraft(ptyId, body)` → `closeDropdown()` → `requestAnimationFrame` で textarea 選択状態化
- [ ] `parsePlaceholders(body)[0]` があれば `setSelectionRange(start, end)`、無ければ末尾にキャレット
- [ ] textarea にフォーカス復帰
- [ ] 単体テストで body に `{{path}}` を含む場合の挙動を検証
- [ ] 手動確認: プレースホルダ選択状態でツリー `⌘+Click`（macOS）/ `Ctrl+Click`（win/linux）・右クリック挿入・`⌘P` パスパレットから選択範囲が置換されること（testing.md ケース 2-A / 2-B / 2-C）
- [ ] もし `⌘P` 経由で選択が失われる場合、`promptPaletteStore` に `lastSelection: { start: number; end: number } | null` を追加し、パスパレット open 直前に保持 / insertAtCaret 時に復元する保険対応を入れる（実装時に必要性判断）

### T3-3: テンプレートエディタ

- [ ] `src/components/PromptPalette/PromptTemplateEditor.tsx` を新規作成
- [ ] Radix `Dialog`（modal=true、子 Dialog）で配置
- [ ] 表示条件: `editorState !== null`
- [ ] create モード: name/body 空、`initialBody` があれば本文に流し込む
- [ ] edit モード: 該当テンプレを引いて name/body/tags を初期値にセット
- [ ] バリデーション: name 必須・255 字以内・ユニーク、body 必須・10,000 字以内
- [ ] 重複チェック: 他のテンプレの name と照合（自分自身は除外）
- [ ] `⌘Enter`/`Ctrl+Enter` で保存（有効時）
- [ ] `Esc` でエディタのみ閉じる（親パレットは残す）
- [ ] 保存で `upsertTemplate` + `closeEditor()`
- [ ] edit モードで「削除」ボタン → `AlertDialog` 確認 → `removeTemplate` + `closeEditor()`
- [ ] ルート DOM に `data-palette-dropdown="editor"` 属性
- [ ] `src/components/PromptPalette/PromptTemplateEditor.test.tsx` を新規作成
- [ ] テスト: create 保存、edit モード初期値、name 重複 disable、`initialBody` 反映、削除確認
- [ ] `npm run test -- PromptTemplateEditor` がパス

### T3-4: Tab プレースホルダ遷移

- [ ] `src/lib/templatePlaceholders.ts` に `findPreviousPlaceholder(body, caret)` を追加
- [ ] `src/lib/templatePlaceholders.test.ts` に `findPreviousPlaceholder` のテスト追加
- [ ] `PromptPalette.tsx` の `handleKeyDown` に `Tab`/`Shift+Tab` ハンドラ追加
- [ ] `Tab`: `findNextPlaceholder(value, caret)` があれば選択状態化 + `preventDefault`、無ければフォールスルー
- [ ] `Shift+Tab`: `findPreviousPlaceholder(value, caret)` があれば選択状態化、無ければフォールスルー
- [ ] IME 変換中は発動しない
- [ ] `PromptPalette.test.tsx` にテスト追加（Tab で次プレースホルダ、Shift+Tab で前、無しでフォールスルー）

### T3-5: `⌘T` と `/` サジェスト

- [ ] `PromptPalette.tsx` の `handleKeyDown` に `⌘T`/`Ctrl+T` 処理追加（IME・修飾組み合わせガード）
- [ ] `toggleTemplateDropdown` 関数を追加
- [ ] ヘッダに `TemplateButton`（`BookTemplate` アイコン + tooltip）を追加
- [ ] `src/components/PromptPalette/SlashSuggest.tsx` を新規作成
- [ ] textarea draft が `/` で始まるかを props で受け、query（`/` 以降のトークン）と candidates を管理
- [ ] 候補は `templates` を name で fuzzy、上位 10 件
- [ ] `↑`/`↓`/`Enter` 操作、`Esc` でサジェストのみ閉じる（テキストは維持）
- [ ] 選択で全文置換 → F3-2 のプレースホルダ選択状態化
- [ ] 条件喪失（改行挿入、先頭 `/` 削除、空文字）で自動クローズ
- [ ] `src/components/PromptPalette/SlashSuggest.test.tsx` を新規作成
- [ ] テスト: 表示条件、fuzzy 絞り込み、`Enter` 選択、`Esc` クローズ
- [ ] `src/lib/shortcuts.ts` に `shortcuts.label.promptTemplate` エントリ追加
- [ ] i18n に `shortcuts.label.promptTemplate`（ja/en）追加

### T3-6: 履歴→テンプレ昇格

- [ ] `PromptHistoryDropdown.tsx` の各行右端に「テンプレに保存」アイコン（`FilePlus`）追加
- [ ] クリックで `openEditor({ mode: 'create', initialBody: entry.body })` + `closeDropdown()`
- [ ] ストア型: `PaletteEditorState.create` に `initialBody?: string` を追加（Phase 1 からの小変更）
- [ ] エディタで `initialBody` を受け取って本文初期値にセット（T3-3 の一部）
- [ ] `PromptHistoryDropdown.test.tsx` に昇格アクションのテスト追加
- [ ] `PromptTemplateEditor.test.tsx` に `initialBody` 反映テスト追加

### T3-7: 既存パレット統合と外側クリック例外拡張

- [ ] `PromptPalette.tsx` の `onPointerDownOutside` 例外判定に `data-palette-dropdown="editor"` を含める
- [ ] `PromptPalette.tsx` の `onEscapeKeyDown` 判定に `editorState !== null` を加える（エディタ表示中は Esc でパレットを閉じない）
- [ ] テンプレドロップダウン表示中に `⌘T` を押すと閉じるトグル動作
- [ ] `⌘H` と `⌘T` の排他（一方開いているときに他方を押すと切り替え）

### T3-F: 最終確認・コミット

- [ ] `npm run lint` 本変更分でエラーなし
- [ ] `npm run test` 全件 pass
- [ ] `npm run build` 型エラーなし
- [ ] `testing.md` の手動確認ケースを実施
- [ ] ユーザーに確認を依頼してからコミット
- [ ] コミットメッセージ案: `feat(prompt-palette): テンプレート機能の UI 統合（Phase 3）`
- [ ] 完了後、プロジェクトドキュメント `03_WBS.md` の Phase 3 タスクを `[x]` に更新

## 完了条件

- [ ] 全タスクが完了
- [ ] `npm run lint` がエラーなし（本変更分）
- [ ] `npm run test` が全件 pass
- [ ] `npm run build` が型エラーなし
- [ ] 手動テスト（ドロップダウン・エディタ・Tab 遷移・`⌘T`・`/` サジェスト・昇格）が全件 OK
- [ ] 既存パレット UX（送信・IME・挿入フラッシュ・履歴・`⌘H`・Esc 段階剥離）にリグレッションなし
- [ ] マイルストーン M3 達成: テンプレ新規作成・選択・プレースホルダ Tab 遷移・`/` サジェスト・履歴昇格が全て動作
