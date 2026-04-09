# 設計書 - Phase 1-E: 右ペイン分割表示（Split View）

## アーキテクチャ

### 対象コンポーネント

```
MainArea
├── mainLayout === 'tab'  → MainTabs（現行）
│     タブバー + コンテンツ or ターミナル
│
└── mainLayout === 'split' → SplitView（新規）
      左ペイン: SplitPaneHeader + コンテンツ
      右ペイン: SplitPaneHeader + TerminalTabs
      ↑ SplitPane コンポーネントで横分割
```

### 影響範囲

- **フロントエンド**: `MainArea.tsx`（分岐追加）、`MainTabs.tsx`（Split ボタン + ショートカット追加）
- **バックエンド（Rust）**: 変更なし

---

## 実装方針

### 概要

`MainArea.tsx` で `mainLayout` を参照し、`'tab'` なら既存の `<MainTabs>`、`'split'` なら `<SplitPane>` でコンテンツとターミナルを横並び表示する。各ペインにヘッダーバーを追加し、`[ ✕ ]` で `toggleMainLayout()` を呼んでタブモードに戻す。

### 詳細

1. `MainArea.tsx` に `mainLayout` の分岐を追加
2. Split 時は `SplitPane` に 2 つのペイン（ヘッダー付き）を渡す
3. `MainTabs.tsx` のタブバーに `Columns2` ボタンを追加し `toggleMainLayout` と接続
4. `MainTabs.tsx` の `Ctrl+Tab` ハンドラに `mainLayout === 'tab'` のガードを追加
5. `Ctrl+\` ショートカットを `MainTabs.tsx` の `useEffect` に追加

---

## データ構造

### appStore（変更なし・参照のみ）

```typescript
// Phase 1-D で実装済み
mainLayout: 'tab' | 'split'
toggleMainLayout: () => void
```

---

## UI 設計

### UI ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| `lucide-react` | `Columns2`（Split ボタン）、`FileText`、`Terminal`、`X`（閉じる）アイコン |

### カラーパレット

- Split ボタン（アクティブ時）: `--color-accent`
- Split ボタン（非アクティブ時）: `--color-text-muted`
- Split ペインヘッダー: `--color-bg-elevated` 背景 + `--color-border` 下線
- `[ ✕ ]` ボタン: `--color-text-muted`（ホバーで `--color-text-primary`）

### 画面構成

**タブモード（変更なし）:**
```
┌──────────────────────────────────────────────────────────┐
│ [ 📄 コンテンツ ][ > ターミナル ]            [ ⊞ Split ] │
├──────────────────────────────────────────────────────────┤
│                  コンテンツ or ターミナル                 │
└──────────────────────────────────────────────────────────┘
```

**Split モード:**
```
┌─────────────────────────┬────────────────────────────────┐
│ 📄 コンテンツ     [ ✕ ] │ > ターミナル             [ ✕ ] │
├─────────────────────────┼────────────────────────────────┤
│                         │                                │
│   コンテンツビューア    │   TerminalTabs                 │
│                         │   ┌─────────────────────────┐  │
│                         │   │ Terminal 1 | + │         │  │
│                         │   ├─────────────────────────┤  │
│                         │   │ $ _                     │  │
│                         │   └─────────────────────────┘  │
└─────────────────────────┴────────────────────────────────┘
                ↑ドラッグでリサイズ可能
```

### コンポーネント構成

**MainArea.tsx の実装方針（display:none による常時マウント）:**

> **重要な設計変更**: 当初設計では `mainLayout === 'split'` の分岐で `SplitPane` コンポーネントを使い、タブモード時は `MainTabs` を使う予定だったが、`TerminalTabs` が異なるツリー位置に配置されると React がアンマウント→リマウントし PTY セッションが破棄される問題が判明。
>
> **採用した解決策**: `TerminalTabs` を常に同じツリー位置（コンテンツペインの兄弟）に固定し、`display: none` で表示/非表示を制御する。`SplitPane` コンポーネントと `MainTabs.tsx` (Radix Tabs) は使用しない。

```tsx
export function MainArea() {
  // タブバー・Split ボタン・Ctrl+Tab/Ctrl+\ をすべてここで管理
  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      {/* カスタムタブバー（タブモード時のみタブを表示、常に Split ボタン表示） */}
      <div className="flex items-center h-9 flex-shrink-0" style={{...}}>
        {!isSplit && (['content', 'terminal'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveMainTab(tab)} ...>...</button>
        ))}
        <div className="ml-auto flex items-center pr-2">
          <button onClick={toggleMainLayout}><Columns2 size={14} /></button>
        </div>
      </div>

      {/* コンテンツエリア: コンテンツペイン + セパレーター + ターミナルペイン を常時レンダリング */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* コンテンツペイン: display:none で表示/非表示 */}
        <div style={{ display: isSplit || activeMainTab === 'content' ? 'flex' : 'none', ... }}>
          {isSplit && <SplitPaneHeader label="コンテンツ" ... />}
          {contentNode}
        </div>

        {/* セパレーター: Split 時のみ表示、ドラッグでリサイズ */}
        {isSplit && <div className="w-1 cursor-col-resize" onMouseDown={onSeparatorMouseDown} />}

        {/* ターミナルペイン: 常に同じツリー位置、display:none で表示/非表示 */}
        <div style={{ display: isSplit || activeMainTab === 'terminal' ? 'flex' : 'none', ... }}>
          {isSplit && <SplitPaneHeader label="ターミナル" ... />}
          <TerminalTabs />  {/* ← 常にここ。アンマウントされない */}
        </div>
      </div>
    </div>
  )
}
```

**削除されたファイル**: `MainTabs.tsx` — `MainArea.tsx` がタブバーを内包するため不要になった。

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `SplitPaneHeader` を独立ファイルにしない | 1-E でのみ使用する小さなコンポーネントのため | `src/components/MainArea/SplitPaneHeader.tsx` として分離（将来的に必要なら移行） |
| `SplitPane` を使わずカスタムドラッグリサイズ | `SplitPane` にコンテンツを分割すると `TerminalTabs` がアンマウントされ PTY が破棄される | `SplitPane` 使用（PTY セッション破棄の問題あり） |
| Split 解除時に `activeMainTab` を変更しない | どちらの `[ ✕ ]` を押してもタブモードに戻るのみ（ユーザー確認済み） | 閉じた側に応じてアクティブタブを変更 |

## 未解決事項

- なし
