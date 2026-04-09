# タスクリスト - Phase 3-C: キーボードショートカット整備

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 5 |
| 進行中 | 1 (マージ待ち) |
| 未着手 | 0 |

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成 (`requirements.md`)
- [x] 設計書の作成 (`design.md`)
- [x] レビュー完了

**WBSリファレンス**: Phase 3-C 準備作業

---

### T-2: ショートカット定義の集約（3-C-1）

**WBSリファレンス**: 3-C-1

- [x] `src/lib/shortcuts.ts` を新規作成
  - [x] `ShortcutDef` / `ShortcutCategory` 型を定義
  - [x] ショートカット定義配列 `SHORTCUT_DEFS` を export

**対象ファイル:**
- `src/lib/shortcuts.ts`（新規）

---

### T-3: ストアへのタブ操作アクション追加（3-C-1）

**WBSリファレンス**: 3-C-1

- [x] `contentStore.ts` にアクションを追加
  - [x] `addNewTab()` — 新規タブを末尾に追加してアクティブ化
  - [x] `closeActiveTab()` — アクティブタブを閉じ、左隣をアクティブにする
  - [x] `activateTabByIndex(index: number)` — 0-indexed でアクティブ化
  - [x] `activatePrevTab()`
- [x] `terminalStore.ts` に同様のアクションを追加
- [x] `npm run lint` でエラーなし

**対象ファイル:**
- `src/stores/contentStore.ts`（変更）
- `src/stores/terminalStore.ts`（変更）

---

### T-4: グローバルキーハンドラ登録（3-C-1）

**WBSリファレンス**: 3-C-1

- [x] `AppLayout.tsx` にグローバル `keydown` リスナーを追加
  - [x] `INPUT` / `TEXTAREA` / `.xterm-helper-textarea` へのフォーカス時はスキップ
  - [x] 各ショートカットのハンドラを実装
- [x] 既存の `Ctrl+Tab`（ペイン切り替え）と競合しないことを確認
- [x] `npm run lint` でエラーなし

**対象ファイル:**
- `src/components/Layout/AppLayout.tsx`（変更）

---

### T-5: ショートカット一覧モーダル（3-C-2）

**WBSリファレンス**: 3-C-2

- [x] `src/components/KeyboardShortcuts/ShortcutsModal.tsx` を新規作成
  - [x] Radix UI `Dialog.Root` でモーダル実装
  - [x] `SHORTCUT_DEFS` をカテゴリ別にグループ化して表示
  - [x] キーバッジを `⌘` / `Ctrl` / `⇧` 等の記号で表示
- [x] `?` キーでモーダルの open/close が切り替わる
- [x] `Esc` でモーダルが閉じる
- [x] `npm run lint` でエラーなし

**対象ファイル:**
- `src/components/KeyboardShortcuts/ShortcutsModal.tsx`（新規）
- `src/components/Layout/AppLayout.tsx`（変更：`ShortcutsModal` のマウント）

---

### T-6: 結合テスト・マージ

**WBSリファレンス**: 3-C-1, 3-C-2

- [x] `npx tauri dev` でアプリ起動確認
- [x] 手動テスト全項目 OK（testing.md 参照）
- [x] `npm run lint` がエラーなし
- [ ] `cd src-tauri && cargo test` がパス（Rustは変更なしだが念のため）
- [ ] `feature/3-C-keyboard-shortcuts` → `develop` へマージ

**ブランチ**: `feature/3-C-keyboard-shortcuts`

---

## 完了条件

- [ ] 全タスクが完了
- [x] `npm run lint` がエラーなし
- [x] 手動テストが全件OK
- [x] `Cmd+T` / `Cmd+W` / `Cmd+\` / `?` キーが動作する
- [x] ショートカット一覧モーダルが正しく表示される
- [x] ターミナル入力中にショートカットが誤発動しない
- [ ] `develop` ブランチへのマージ済み
