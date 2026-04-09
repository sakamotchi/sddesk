# 統合ターミナル機能仕様書

**バージョン**: 1.0
**作成日**: 2026年3月28日
**最終更新**: 2026年3月28日

---

## 1. 概要

統合ターミナルは、アプリ内でシェルを直接操作できる機能です。Claude CodeなどのAI CLIツールをSpecPromptから離れることなく実行できます。

**機能ID**: FR-03

---

## 2. 機能要件

### 2.1 基本動作

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| T-01 | PTYプロセス起動 | `portable-pty` クレートを使ってシェル（デフォルト: `/bin/zsh`）を起動する |
| T-02 | 入力送信 | キー入力を即座にPTYに書き込む |
| T-03 | 出力表示 | PTYの出力をxterm.jsに書き込む（ストリーミング） |
| T-04 | ターミナルリサイズ | ウィンドウ/ペインのリサイズ時にPTYのcolsとrowsを更新する |
| T-05 | ターミナルクローズ | タブを閉じるときにPTYプロセスを終了する |

### 2.2 複数タブ

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| T-06 | 複数タブ | 複数のターミナルセッションを同時に開くことができる |
| T-07 | タブ切り替え | タブクリックまたはショートカットでセッションを切り替える |
| T-08 | タブ追加 | 「+」ボタンで新しいターミナルタブを開く |
| T-09 | タブ閉じる | 「×」ボタンまたは `Ctrl+W` でタブを閉じる |
| T-10 | タブ名 | デフォルトは「Terminal {N}」（N=連番）。カレントディレクトリ表示は任意 |

### 2.3 分割表示

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| T-11 | 水平分割 | ターミナルを左右に2分割して表示できる |
| T-12 | 垂直分割 | ターミナルを上下に2分割して表示できる |
| T-13 | 分割解除 | 分割ペインを閉じて1画面に戻せる |

---

## 3. 技術仕様

### 3.1 フロントエンド

**コンポーネント**: `src/components/TerminalPanel/`

- `TerminalTabs.tsx`: タブ管理UI
- `TerminalPanel.tsx`（または各タブコンポーネント）: xterm.jsの初期化・イベント処理

**使用ライブラリ**:
- `@xterm/xterm ^5.5.0` — ターミナルエミュレータ
- `@xterm/addon-fit ^0.10.0` — コンテナサイズに合わせた自動リサイズ

**初期化フロー**:

```
useEffect(() => {
  1. new Terminal({ ... }) でインスタンス作成
  2. new FitAddon() でアドオン追加
  3. terminal.open(containerRef.current) でDOM接続
  4. fitAddon.fit() でサイズ合わせ
  5. tauriApi.spawnPty(shell, cwd) でPTY起動 → ptyId取得
  6. listen("pty-output", ...) でTauriイベント購読
  7. terminal.onData(data => tauriApi.writePty(ptyId, data)) でキー入力送信
  8. terminal.onResize(({ cols, rows }) => tauriApi.resizePty(ptyId, cols, rows))
  return cleanup: unlisten(), tauriApi.closePty(ptyId), terminal.dispose()
})
```

### 3.2 バックエンド

**モジュール**: `src-tauri/src/commands/pty.rs`

**データ構造**:

```rust
pub struct PtyInstance {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

pub struct PtyManager {
    instances: Mutex<HashMap<String, PtyInstance>>,
}
```

**Tauriコマンド**:

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `spawn_pty` | `shell: String, cwd: String` | `Result<String, String>` | PTY起動、PTY IDを返す |
| `write_pty` | `id: String, data: String` | `Result<(), String>` | PTYにデータ送信 |
| `resize_pty` | `id: String, cols: u16, rows: u16` | `Result<(), String>` | PTYサイズ変更 |
| `close_pty` | `id: String` | `Result<(), String>` | PTY終了・削除 |

**Tauriイベント**:

| イベント名 | ペイロード | タイミング |
|-----------|-----------|-----------|
| `pty-output` | `{ id: string, data: string }` | PTYから出力があるたび（専用スレッドからemit） |

**PTY出力ストリーミング（スレッド）**:

```rust
let reader = master.try_clone_reader()?;
thread::spawn(move || {
    let mut buf = [0u8; 4096];
    loop {
        match reader.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) => {
                let data = String::from_utf8_lossy(&buf[..n]).to_string();
                app.emit("pty-output", PtyOutput { id: id.clone(), data }).ok();
            }
        }
    }
});
```

### 3.3 状態管理

**ストア**: `src/stores/terminalStore.ts`

```typescript
interface TerminalTab {
  id: string        // UUID
  ptyId: string | null
  title: string
  isActive: boolean
}

interface TerminalState {
  tabs: TerminalTab[]
  activeTabId: string | null
  splitLayout: SplitLayout | null
}
```

---

## 4. エラーハンドリング

| エラー | 対応 |
|--------|------|
| PTY起動失敗 | `console.error` + ターミナルにエラーメッセージ表示 |
| PTY書き込み失敗 | 無視（接続切断後の入力は破棄） |
| PTYプロセス終了（自然終了） | タブにプロセス終了メッセージ表示 |

---

## 5. 注意事項

- PTYの `slave` は `spawn_command` 実行後に即 `drop` すること（ファイルディスクリプタのリーク防止）
- PTY読み取りスレッドは `PtyManager` の外で動作するため、スレッドセーフティに注意
- `AppHandle` はスレッド間でクローン可能（`clone()`）
- xterm.jsのFitAddonは、コンテナのDOMサイズが確定してから `fit()` を呼ぶこと

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-03-28 | 1.0 | 初版作成 | - |
