# 要件定義書 - Phase 1-D: 状態管理基盤（Zustand persist）

## 概要

Zustand の `persist` ミドルウェアを `appStore` に適用し、アプリを再起動しても前回のセッション状態（最後に開いたプロジェクト・選択ファイル・ツリー展開状態）を復元できるようにする。

## 背景・目的

Phase 1-A〜1-C で `appStore` / `terminalStore` の実装は完了している。現状はアプリを再起動するたびにプロジェクトを開き直す必要があり、体験が損なわれている。`persist` を追加することで「前回の続き」から作業を再開できる。

## 要件一覧

### 機能要件

#### F-1: プロジェクト状態の永続化

- **説明**: 最後に開いたプロジェクトの情報を再起動後も復元する
- **受け入れ条件**:
  - [ ] アプリ再起動後に `projectRoot` が復元され、ファイルツリーが自動で再取得・表示される
  - [ ] `selectedFile` が復元され、ハイライト表示される
  - [ ] `expandedDirs`（展開状態）が復元される
  - [ ] `activeMainTab`（コンテンツ/ターミナル）が復元される

#### F-2: Set 型のシリアライズ対応

- **説明**: `expandedDirs: Set<string>` は JSON 非対応のため、カスタムシリアライザーで対応する
- **受け入れ条件**:
  - [ ] `Set<string>` が JSON 保存・復元時に正しく `Set` として扱われる
  - [ ] 保存データは `localStorage` の `spec-prompt-app-store` キーに格納される

#### F-3: 永続化対象の限定

- **説明**: 不要なデータを永続化しない
- **受け入れ条件**:
  - [ ] `fileTree` は永続化しない（再起動時に `read_dir` で再取得する）
  - [ ] `terminalStore` は永続化しない（PTY セッションは OS 再起動で消える）

### 非機能要件

- **パフォーマンス**: 永続化はキー操作・クリックのたびに発生するが、localStorage への書き込みは同期的かつ軽量なため問題なし
- **保守性**: persist の設定は各ストアファイル内に閉じる。将来的に Tauri の `store` プラグインへ移行しやすい構造にする

## スコープ

### 対象

- `src/stores/appStore.ts`（`persist` 追加、`Set` カスタムシリアライザー実装）

### 対象外

- `terminalStore` の永続化（PTY はセッションごとに起動し直すため不要）
- Tauri ネイティブストレージ（`tauri-plugin-store`）への移行（Phase 2-F）
- 設定ファイル（`~/.config/spec-prompt/config.json`）への書き込み（Phase 2-F）

## 実装対象ファイル（予定）

- `src/stores/appStore.ts`（persist 追加）

## 依存関係

- Phase 1-A / 1-B が完了していること（`appStore` が実装済み）
- `zustand/middleware` は Zustand に同梱されており追加インストール不要

## 既知の制約

- `localStorage` は Tauri の WebView 内で利用可能。ただし OS ユーザーごとのプロファイル（`~/Library/Application Support/...`）に保存される
- `zustand/middleware` の `persist` はデフォルトで `localStorage` を使用する。Tauri では問題なし
- `Set` 型は JSON.stringify でシリアライズされないため、`partialize` + カスタム `storage` または `reviver` で対応が必要

## 参考資料

- `docs/steering/03_architecture_specifications.md` - セクション 5（データ永続化）
- `src/stores/appStore.ts` - 現在の実装
