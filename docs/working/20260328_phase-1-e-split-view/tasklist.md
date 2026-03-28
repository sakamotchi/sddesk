# タスクリスト - Phase 1-E: 右ペイン分割表示（Split View）

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 4 |

## タスク一覧

### T-1: 要件定義・設計

- [ ] 要件定義書の作成 (`requirements.md`)
- [ ] 設計書の作成 (`design.md`)
- [ ] レビュー完了

**WBSリファレンス**: Phase 1-E 準備作業

---

### T-2: `MainTabs.tsx` に Split ボタン・ショートカット追加

**WBSリファレンス**: 1-E-3

- [ ] `Columns2` アイコンボタンをタブバー右端に追加
- [ ] ボタンクリックで `toggleMainLayout()` を呼び出す
- [ ] Split モード中はボタンを `--color-accent` でハイライト表示
- [ ] `Ctrl+\` ショートカットで `toggleMainLayout()` を呼び出す
- [ ] `Ctrl+Tab` に `mainLayout === 'tab'` のガード条件を追加
- [ ] `npm run lint` でエラーなし

**対象ファイル**:
- `src/components/MainArea/MainTabs.tsx`

---

### T-3: `MainArea.tsx` に Split レンダリングを追加

**WBSリファレンス**: 1-E-2

- [ ] `mainLayout === 'split'` の時に `SplitPane` で左右分割表示
- [ ] 各ペインに `SplitPaneHeader`（ラベル + `[ ✕ ]` ボタン）を追加
- [ ] `[ ✕ ]` ボタンで `toggleMainLayout()` を呼び出す（タブモードに戻る）
- [ ] `defaultSize` を適切な初期値（500px）に設定
- [ ] `npm run lint` でエラーなし

**対象ファイル**:
- `src/components/MainArea/MainArea.tsx`

---

### T-4: 結合・手動テスト・マージ

- [ ] `npx tauri dev` でアプリ起動確認
- [ ] 手動テスト全項目 OK（testing.md 参照）
- [ ] `npm run test` がパス
- [ ] `npm run lint` がエラーなし
- [ ] `feature/1-E-split-view` → `develop` へマージ

**ブランチ**: `feature/1-E-split-view`

---

## 完了条件

- [ ] 全タスクが完了
- [ ] `npm run lint` がエラーなし
- [ ] `npm run test` がパス
- [ ] 手動テスト（testing.md）が全件 OK
- [ ] Split ボタン / `Ctrl+\` でモード切り替えができる
- [ ] Split モードでコンテンツとターミナルが横並び表示される
- [ ] `develop` ブランチへのマージ済み
