# タスクリスト - Phase 1-D: 状態管理基盤（Zustand persist）

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 3 |

## タスク一覧

### T-1: 要件定義・設計

- [ ] 要件定義書の作成 (`requirements.md`)
- [ ] 設計書の作成 (`design.md`)
- [ ] レビュー完了

**WBSリファレンス**: Phase 1-D 準備作業

---

### T-2: `appStore` に persist を追加

**WBSリファレンス**: 1-D-3

- [ ] `zustand/middleware` から `persist` / `createJSONStorage` をインポート
- [ ] `create<AppState>()(persist(...))` の形に変更
- [ ] `partialize` で `fileTree` を除外
- [ ] `replacer` / `reviver` で `Set<string>` のシリアライズ対応
- [ ] ストレージキーを `'spec-prompt-app-store'` に設定
- [ ] `appStore.test.ts` に persist のテストを追加
  - [ ] `projectRoot` が localStorage に保存される
  - [ ] `expandedDirs` の Set が正しく変換される
  - [ ] `fileTree` は保存されない
- [ ] `npm run lint` でエラーなし
- [ ] `npm run test` がパス

**対象ファイル**:
- `src/stores/appStore.ts`
- `src/stores/appStore.test.ts`

---

### T-3: 結合・手動テスト・マージ

- [ ] `npx tauri dev` でアプリ起動確認
- [ ] 手動テスト全項目 OK（testing.md 参照）
- [ ] `npm run test` がパス
- [ ] `npm run lint` がエラーなし
- [ ] `feature/1-D-state-management` → `develop` へマージ

**ブランチ**: `feature/1-D-state-management`

---

## 完了条件

- [ ] 全タスクが完了
- [ ] `npm run lint` がエラーなし
- [ ] `npm run test` がパス（persist テスト含む）
- [ ] 手動テスト（testing.md）が全件 OK
- [ ] アプリ再起動後にプロジェクト・選択ファイル・展開状態が復元される
- [ ] `develop` ブランチへのマージ済み
