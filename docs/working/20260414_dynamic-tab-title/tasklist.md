# タスクリスト - dynamic-tab-title（P2）

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 12 |

## 前提

本フェーズは **Phase 1**（`feature/p1-notification-tab-name`）の以下を前提とする:
- `DisplayTitleCache` 構造体（`src-tauri/src/commands/notification.rs`）
- `set_pty_display_title` Tauri コマンド
- `tauriApi.setPtyDisplayTitle`
- `TerminalPanel` の spawn 時初期同期

Phase 1 が `main` にマージされていない場合、本ブランチに P1 をマージするか、P1 マージ後に本ブランチを `main` にリベースする。

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成（`requirements.md`）
- [x] 設計書の作成（`design.md`）
- [x] タスクリストの作成（`tasklist.md`）
- [x] テスト手順書の作成（`testing.md`）
- [ ] ユーザーレビュー完了

### T-2: 事前調査 — alacritty_terminal の OSC 挙動確認

対応要件: F-1

- [ ] alacritty_terminal v0.25.1 で OSC 0 / 1 / 2 が `Event::Title(String)` / `Event::ResetTitle` にどうマップされるかを最小 POC で確認
- [ ] POC: `TermEventHandler::send_event` に `log::info!` を仕込み、OSC を `printf` で流し込んだときのイベント種別を確認
- [ ] OSC 0 / 1 が `Event::Title` に来るか別扱いか判明させ、必要なら設計書を更新

### T-3: Rust — `TermEventHandler` 刷新

対応要件: F-1

- [ ] `src-tauri/src/terminal/event.rs` の `TermEventHandler` をユニット構造体から `{ app: AppHandle, pty_id: String }` に変更
- [ ] `new(app, pty_id)` コンストラクタ追加
- [ ] `Serialize` な `TitleChangedPayload` 型を定義
- [ ] `build_payload(pty_id, event)` ヘルパー（テスト容易性のため）
- [ ] `send_event` で `Event::Title` / `Event::ResetTitle` を捕捉して `app.emit("terminal-title-changed", payload)`
- [ ] 他バリアントは従来どおり無視
- [ ] `cd src-tauri && cargo check` がエラーなし

### T-4: Rust — `TerminalInstance::new` シグネチャ変更

対応要件: F-4

- [ ] `src-tauri/src/terminal/instance.rs` の `TerminalInstance::new(cols, lines)` → `new(cols, lines, app, pty_id)` へ変更
- [ ] 内部で `TermEventHandler::new(app, pty_id)` を生成して `Term::new` に渡す
- [ ] `cd src-tauri && cargo check` がエラーなし

### T-5: Rust — `pty.rs` 呼び出し更新

対応要件: F-4

- [ ] `src-tauri/src/commands/pty.rs:132` の `TerminalInstance::new(80, 24)` を `TerminalInstance::new(80, 24, app.clone(), id.clone())` に変更
- [ ] 既存の `terminal-cells` 配信・スクロール・リサイズに回帰なし
- [ ] `cd src-tauri && cargo check` がエラーなし
- [ ] `cd src-tauri && cargo test` がパス

### T-6: Rust — ユニットテスト

対応要件: F-1

- [ ] `event.rs` の `build_payload` ヘルパーに対して 5 件テスト（title / trim / empty→None / reset / その他バリアント無視）
- [ ] `cd src-tauri && cargo test` がパス

### T-7: Front — 型定義とユーティリティ

対応要件: F-2

- [ ] `src/stores/terminalStore.ts` の `TerminalTab` 型を `{ id, ptyId, fallbackTitle, oscTitle }` に変更
- [ ] `makeTab` が `fallbackTitle: "Terminal N"` / `oscTitle: null` を設定するように変更
- [ ] `sanitizeTitle` 関数をエクスポート
- [ ] `computeDisplayTitle` 関数をエクスポート
- [ ] 既存コードで `tab.title` を参照している箇所を grep で洗い出し、`computeDisplayTitle(tab)` に置換

### T-8: Front — `setOscTitle` アクション

対応要件: F-2

- [ ] `TerminalState` に `setOscTitle(ptyId, rawTitle)` を追加
- [ ] `primary` / `secondary` 両方のペインを走査し、該当 `ptyId` のタブを更新
- [ ] サニタイズ後の値と直前値が同一ならストア更新をスキップ（参照同一性で早期 return）

### T-9: Front — Tauri API と購読

対応要件: F-1 (フロント側受信)

- [ ] `src/lib/tauriApi.ts` に `TerminalTitleChangedPayload` 型と `onTerminalTitleChanged` リスナーを追加
- [ ] `src/App.tsx`（または適切な初期化箇所）で `onTerminalTitleChanged` を購読し `setOscTitle` を呼ぶ
- [ ] クリーンアップ（`useEffect` return）で `unlisten` を呼ぶ

### T-10: Front — Zustand subscribe による Rust 同期

対応要件: F-3

- [ ] `App.tsx` で `useTerminalStore.subscribe` を起動
- [ ] `(tab.ptyId, computeDisplayTitle(tab))` の組が変化したタブを検出し `tauriApi.setPtyDisplayTitle(ptyId, display)` を呼ぶ
- [ ] クリーンアップで unsubscribe

### T-11: Front — UI 表示の差し替え

対応要件: F-2

- [ ] `src/components/TerminalPanel/TerminalTabs.tsx:117` を `computeDisplayTitle(tab)` に変更
- [ ] ラベルに Tailwind の `max-w-[12rem] truncate` 相当を適用
- [ ] `<span title={display}>` でツールチップ表示

### T-12: Front — ユニットテスト

対応要件: F-2, F-3

- [ ] `terminalStore.test.ts` に以下を追加:
  - `sanitizeTitle`: trim / 制御文字除去 / 空 → null / null 入力
  - `computeDisplayTitle`: oscTitle 優先 / null 時は fallbackTitle
  - `setOscTitle`: 該当タブの更新 / 空文字リセット / unknown ptyId 無視
- [ ] `npm run test` がパス

### T-13: 結合・テスト

対応要件: F-1 〜 F-4 通し

- [ ] `npx tauri dev` で起動確認
- [ ] `testing.md` の手動テスト全件を実行
- [ ] 既存機能（P1 の通知タイトル差し込み含む）の回帰なし

### T-14: ドキュメント・マージ

- [ ] 永続化ドキュメント（`docs/steering/02_functional_design.md` 等）への反映要否を確認
- [ ] コミット・PR 作成（`feature/p2-dynamic-tab-title` → `main`、P1 のマージ順序に注意）
- [ ] レビュー → マージ

## 完了条件

- [ ] 全タスク（T-1 〜 T-14）が完了
- [ ] `npm run lint` がエラーなし（新規追加分）
- [ ] `npm run test` がパス
- [ ] `cd src-tauri && cargo test` がパス
- [ ] `testing.md` の手動テストが全件 OK
- [ ] P1 の通知タイトル差し込み挙動が OSC タイトル変化に追随する（= 通知タイトルが `Claude Code — vim foo.ts` のように動的に変わる）
- [ ] Phase 3（手動リネーム）の実装時に `computeDisplayTitle` を拡張するだけで済む構造になっている
