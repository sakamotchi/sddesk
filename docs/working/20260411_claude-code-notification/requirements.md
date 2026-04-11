# 要件定義書 - claude-code-notification

## 概要

SpecPrompt の統合ターミナル上で Claude Code を使用中に、Claude Code がユーザーの承認を必要とするとき、または作業を完了したときに macOS デスクトップ通知を発火する機能を追加する。

OSC 9 エスケープシーケンスを xterm.js で受け取る方式を採用するため、ユーザーによる手動設定は不要（cmux / Ghostty と同等のゼロセットアップ体験）。また、アプリ内設定 UI から通知の ON/OFF を切り替えられる。

## 背景・目的

- Claude Code はターミナル内で動作するため、ウィンドウを見ていないと承認待ちや完了に気づけない
- Claude Code はデフォルトで OSC 9 エスケープシーケンスを出力する。cmux（Ghostty ベース）はこれをターミナルエンジン側で自動的に受け取るため、ユーザー設定不要で通知が機能する
- SpecPrompt も同じアプローチを採用し、xterm.js の OSC ハンドラ + `tauri-plugin-notification` で実現する
- hooks + osascript による手動設定（フェーズ 1）は不要とする

## 要件一覧

### 機能要件

#### F-1: OSC 9 シーケンスによる自動通知

- **説明**: Claude Code が出力する OSC 9 エスケープシーケンス（`ESC ] 9 ; <message> BEL`）を xterm.js が受け取り、`tauri-plugin-notification` 経由で macOS デスクトップ通知を発火する
- **受け入れ条件**:
  - [ ] SpecPrompt 上で `claude` を起動し、作業完了時に macOS 通知が表示される
  - [ ] ユーザーは `~/.claude/settings.json` やシェルスクリプトを手動設定しなくてよい
  - [ ] 通知タイトルは `SpecPrompt / Claude Code`、本文は OSC メッセージの内容が表示される

#### F-2: 通知設定 UI

- **説明**: アプリ内設定画面から通知の ON/OFF を切り替えるトグルスイッチを提供する
- **受け入れ条件**:
  - [ ] 設定画面に「Claude Code 通知」トグルが表示される
  - [ ] トグルを OFF にすると OSC 9 を受け取っても通知が発火しない
  - [ ] 設定はアプリ再起動後も維持される（Zustand persist による永続化）
  - [ ] 初期値は ON

### 非機能要件

- **パフォーマンス**: OSC ハンドラの処理がターミナルのレンダリングをブロックしないこと
- **ユーザビリティ**: ゼロセットアップ。アプリを起動するだけで通知が有効になること
- **保守性**: 通知コマンドは独立した `notification.rs` として分離し、将来の拡張（通知音・クリックフォーカス等）に対応しやすくする
- **外観・デザイン**: 設定 UI は既存のカラーパレット（`--color-bg-elevated`, `--color-accent` 等）に従う。Radix UI の Switch プリミティブを使用する

## スコープ

### 対象

- xterm.js への OSC 9 カスタムハンドラ追加
- `tauri-plugin-notification` による macOS 通知発火
- `appStore` への `notificationEnabled` フィールド追加
- 設定 UI コンポーネント（通知 ON/OFF トグル）

### 対象外

- 通知クリックでウィンドウをフォーカスする動作
- 通知音のカスタマイズ
- アプリ内通知パネル（履歴・未読バッジ）
- hooks + osascript の自動セットアップ
- Windows / Linux 向け通知対応（macOS のみ）

## 実装対象ファイル（予定）

- `src/stores/terminalStore.ts` — OSC 9 ハンドラ登録
- `src/stores/appStore.ts` — `notificationEnabled` フィールド追加
- `src/components/Settings/NotificationSettings.tsx` — 通知設定 UI（新規）
- `src-tauri/src/commands/notification.rs` — `send_notification` コマンド（新規）
- `src-tauri/src/commands/mod.rs` — `notification` モジュール追加
- `src-tauri/src/lib.rs` — コマンドハンドラ登録
- `src-tauri/Cargo.toml` — `tauri-plugin-notification` 追加
- `src-tauri/capabilities/default.json` — `notification:allow-send-notification` 追加

## 依存関係

- `tauri-plugin-notification`（Tauri 公式プラグイン v2）
- xterm.js `terminal.parser.registerOscHandler`（`@xterm/xterm ^5.5.0` に含まれる）

## 既知の制約

- `tauri-plugin-notification` は macOS のシステム通知権限が必要。初回起動時に権限ダイアログが表示される
- xterm.js の OSC ハンドラは、ターミナルインスタンスの初期化後に登録する必要がある

## 参考資料

- `docs/steering/features/terminal.md` — ターミナルの初期化フローと xterm.js 統合
- `docs/steering/03_architecture_specifications.md` — Tauri IPC 設計
- `docs/local/20260409-claude-code通知機能/01_要件定義書.md` — 初版要件定義
- `docs/local/20260409-claude-code通知機能/02_概要設計書.md` — 初版概要設計
- cmux 実装参考: `GhosttyTerminalView.swift:2697-2719`
