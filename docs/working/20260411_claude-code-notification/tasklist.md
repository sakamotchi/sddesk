# タスクリスト - claude-code-notification

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 1 |
| 進行中 | 0 |
| 未着手 | 4 |

## タスク一覧

### T-1: 要件定義・設計 ✅

- [x] 要件定義書の作成（`requirements.md`）
- [x] 設計書の作成（`design.md`）
- [x] レビュー完了

### T-2: Rust バックエンド実装

- [ ] `tauri-plugin-notification` を `Cargo.toml` に追加
- [ ] `src-tauri/src/commands/notification.rs` を新規作成（`send_notification` コマンド）
- [ ] `src-tauri/src/commands/mod.rs` に `notification` モジュールを追加
- [ ] `src-tauri/src/lib.rs` に `send_notification` をコマンドハンドラとして登録
- [ ] `src-tauri/capabilities/default.json` に `notification:allow-send-notification` を追加
- [ ] `cd src-tauri && cargo check` でエラーなし

### T-3: フロントエンド実装（ストア・ハンドラ）

- [ ] `src/stores/appStore.ts` に `notificationEnabled: boolean`（デフォルト `true`）と setter を追加
- [ ] `src/stores/terminalStore.ts` のターミナル初期化フローに OSC 9 ハンドラを登録
- [ ] `npm run lint` でエラーなし

### T-4: フロントエンド実装（設定 UI）

- [ ] 設定画面の既存コンポーネント有無を確認（なければ `src/components/Settings/` を新規作成）
- [ ] `src/components/Settings/NotificationSettings.tsx` を作成（Radix UI Switch 使用）
- [ ] 設定画面から `NotificationSettings` を組み込む
- [ ] カラーパレット（`--color-accent` 等）が正しく適用されていることを確認

### T-5: 結合・テスト

- [ ] `npx tauri dev` で起動確認
- [ ] 手動テスト（`testing.md` 参照）
- [ ] 通知 OFF 時に通知が発火しないことを確認

### T-6: ドキュメント・マージ

- [ ] 永続化ドキュメント更新（`docs/steering/03_architecture_specifications.md` の IPC コマンド一覧に `send_notification` を追加）
- [ ] コードレビュー
- [ ] `develop` ブランチへの PR マージ

## 完了条件

- [ ] 全タスクが完了
- [ ] `npm run lint` がエラーなし
- [ ] `cd src-tauri && cargo test` がパス
- [ ] 手動テストが全件 OK
- [ ] `docs/steering/03_architecture_specifications.md` の IPC コマンド一覧が更新済み
