# 設計書 - claude-code-notification

## アーキテクチャ

### 対象コンポーネント

```
Claude Code（ターミナル内）
    │  OSC 9 エスケープシーケンス出力
    │  ESC ] 9 ; <message> BEL
    ▼
xterm.js OSC 9 カスタムハンドラ
(src/stores/terminalStore.ts)
    │  appStore.notificationEnabled をチェック
    │  invoke('send_notification', { title, body })
    ▼
Tauri IPC
    ▼
src-tauri/src/commands/notification.rs
    │  tauri_plugin_notification::NotificationExt
    ▼
macOS デスクトップ通知

---

通知設定 UI
(src/components/Settings/NotificationSettings.tsx)
    │  useAppStore().notificationEnabled
    │  useAppStore().setNotificationEnabled(v)
    ▼
src/stores/appStore.ts
    │  Zustand persist middleware
    ▼
localStorage（永続化）
```

### 影響範囲

- **フロントエンド**: `terminalStore.ts`（OSC ハンドラ登録）、`appStore.ts`（フィールド追加）、新規設定 UI コンポーネント
- **バックエンド（Rust）**: `notification.rs` 新規追加、`mod.rs` / `lib.rs` / `Cargo.toml` / `capabilities/default.json` 修正

## 実装方針

### 概要

ターミナルインスタンス生成時に OSC 9 ハンドラを登録する。ハンドラは `appStore` の設定を参照し、通知が有効な場合のみ Tauri IPC を呼び出す。Rust 側は `tauri-plugin-notification` を使って macOS 通知を発火する。

### 詳細

1. xterm.js 初期化フロー（`terminalStore.ts`）の `terminal.open()` 直後に `registerOscHandler(9, ...)` を追加する
2. Rust コマンド `send_notification` を `notification.rs` に実装し、`lib.rs` に登録する
3. `appStore.ts` に `notificationEnabled: boolean`（デフォルト `true`）と setter を追加し、`persist` の対象に含める
4. 設定 UI コンポーネント `NotificationSettings.tsx` を作成し、既存の設定画面に組み込む

## データ構造

### 型定義（TypeScript）

```typescript
// appStore.ts への追加
interface AppState {
  // 既存フィールド...
  notificationEnabled: boolean
  setNotificationEnabled: (enabled: boolean) => void
}
```

### 型定義（Rust）

```rust
// notification.rs
// 独自の構造体定義は不要。引数は文字列のみ。
```

## API 設計

### Tauri コマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `send_notification` | `title: String, body: String` | `Result<(), String>` | macOS 通知を発火する |

### Tauri イベント

今回追加なし。

## UI 設計

### UI ライブラリ

| ライブラリ | 用途 | 備考 |
|-----------|------|------|
| `@radix-ui/react-switch` | ON/OFF トグルスイッチ | アクセシビリティ属性自動付与 |
| `lucide-react` | アイコン（Bell 等） | tree-shaking 対応 |

### カラーパレット

`src/index.css` で定義済みの CSS カスタムプロパティを使用する：

- `--color-bg-elevated` — 設定パネル背景
- `--color-border` — セパレーター
- `--color-text-primary` / `--color-text-muted` — ラベル
- `--color-accent` — トグル ON 状態のアクセント色

### 画面構成

設定画面内の「通知」セクションに配置：

```
┌─────────────────────────────────────┐
│ 通知                                │
├─────────────────────────────────────┤
│  Claude Code 通知      [●──────]   │
│  作業完了・承認待ちを通知します        │
└─────────────────────────────────────┘
```

### コンポーネント構成

```
src/components/Settings/
└── NotificationSettings.tsx   # 通知設定セクション（新規）
```

既存の設定画面がない場合、Settings コンポーネントごと新規作成する。

## 状態管理

### Zustand ストア変更

```typescript
// src/stores/appStore.ts
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 既存の状態...
      notificationEnabled: true,
      setNotificationEnabled: (enabled) => set({ notificationEnabled: enabled }),
    }),
    {
      name: 'app-store',
      // notificationEnabled を persist 対象に含める（デフォルトで全フィールド対象）
    }
  )
)
```

### OSC 9 ハンドラ登録（terminalStore.ts）

```typescript
// ターミナルインスタンス初期化後に追加
terminal.parser.registerOscHandler(9, (data) => {
  const { notificationEnabled } = useAppStore.getState()
  if (!notificationEnabled) return true

  invoke('send_notification', {
    title: 'SpecPrompt / Claude Code',
    body: data,
  }).catch(console.error)

  return true
})
```

### Rust 実装（notification.rs）

```rust
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}
```

## テストコード

### Rust テスト例

```rust
#[cfg(test)]
mod tests {
    // tauri-plugin-notification は実機テストが必要なため、
    // コマンド登録の単体テストは integration test で確認する
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| OSC 9 方式を採用 | ユーザー設定不要、cmux と同等の体験 | hooks + osascript（手動設定が必要） |
| `invoke` は `catch` するがエラーを無視しない | 通知失敗をコンソールに出して将来のデバッグに備える | 完全無視（ユーザーには影響ないが問題把握困難） |
| 設定 UI に Radix UI Switch を使用 | アクセシビリティ属性が自動付与される | `<input type="checkbox">` の独自実装 |
| `notificationEnabled` を `appStore` で管理 | 他の通知設定追加時も同じストアに集約できる | `terminalStore` に持つ（通知は Terminal に限らない将来拡張を考慮） |

## 未解決事項

- [ ] 設定画面の既存コンポーネントが存在するか確認（存在しない場合は新規作成が必要）
- [ ] `tauri-plugin-notification` の macOS 通知権限ダイアログの表示タイミングを確認
