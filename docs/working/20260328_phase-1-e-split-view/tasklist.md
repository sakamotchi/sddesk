# タスクリスト - Phase 1-E: 右ペイン分割表示（Split View）

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 4 |
| 進行中 | 0 |
| 未着手 | 0 |

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成 (`requirements.md`)
- [x] 設計書の作成 (`design.md`)
- [x] レビュー完了

**WBSリファレンス**: Phase 1-E 準備作業

---

### T-2: タブバーに Split ボタン・ショートカット追加

**WBSリファレンス**: 1-E-3

> **設計変更**: `MainTabs.tsx` への追加ではなく `MainArea.tsx` にインライン実装（後述の理由による）

- [x] `Columns2` アイコンボタンをタブバー右端に追加
- [x] ボタンクリックで `toggleMainLayout()` を呼び出す
- [x] Split モード中はボタンを `--color-accent` でハイライト表示
- [x] `Ctrl+\` ショートカットで `toggleMainLayout()` を呼び出す
- [x] `Ctrl+Tab` に `mainLayout === 'tab'` のガード条件を追加
- [x] `npm run lint` でエラーなし

**対象ファイル**:
- `src/components/MainArea/MainArea.tsx`（`MainTabs.tsx` は削除）

---

### T-3: `MainArea.tsx` に Split レンダリングを追加

**WBSリファレンス**: 1-E-2

> **重要な設計変更**: `SplitPane` コンポーネントを使うと `TerminalTabs` がアンマウント→リマウントされ PTY セッションが破棄される問題が発生。`display: none` による常時マウント方式に変更。

- [x] `mainLayout === 'split'` の時に左右分割表示（`display: none` 制御）
- [x] 各ペインに `SplitPaneHeader`（ラベル + `[ ✕ ]` ボタン）を追加
- [x] `[ ✕ ]` ボタンで `toggleMainLayout()` を呼び出す（タブモードに戻る）
- [x] カスタムドラッグリサイズ（`onMouseDown`）を実装
- [x] `TerminalTabs` を常に同じツリー位置に固定（PTY セッション保持）
- [x] `npm run lint` でエラーなし

**対象ファイル**:
- `src/components/MainArea/MainArea.tsx`

---

### T-4: 結合・手動テスト・マージ

- [x] `npx tauri dev` でアプリ起動確認
- [x] 手動テスト全項目 OK（testing.md 参照）
- [x] `npm run test` がパス
- [x] `npm run lint` がエラーなし
- [x] `feature/1-E-split-view` → `develop` へマージ

**ブランチ**: `feature/1-E-split-view`

---

## 完了条件

- [x] 全タスクが完了
- [x] `npm run lint` がエラーなし
- [x] `npm run test` がパス
- [x] 手動テスト（testing.md）が全件 OK
- [x] Split ボタン / `Ctrl+\` でモード切り替えができる
- [x] Split モードでコンテンツとターミナルが横並び表示される
- [x] モード切り替え時にターミナルの PTY セッションが保持される
- [x] `develop` ブランチへのマージ済み
