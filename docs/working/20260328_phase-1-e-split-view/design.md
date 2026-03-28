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

**MainArea.tsx の分岐ロジック:**

```tsx
export function MainArea() {
  const mainLayout = useAppStore((s) => s.mainLayout)
  const toggleMainLayout = useAppStore((s) => s.toggleMainLayout)

  const contentNode = (
    <div className="flex items-center justify-center h-full ...">
      コンテンツビューア（Phase 2-A で実装）
    </div>
  )
  const terminalNode = <TerminalTabs />

  if (mainLayout === 'split') {
    return (
      <div className="flex flex-col h-full">
        <SplitPane direction="horizontal" defaultSize={500} minSize={200} maxSize={...}>
          {/* 左ペイン: コンテンツ */}
          <div className="flex flex-col h-full">
            <SplitPaneHeader label="コンテンツ" icon={<FileText />} onClose={toggleMainLayout} />
            <div className="flex-1 min-h-0">{contentNode}</div>
          </div>
          {/* 右ペイン: ターミナル */}
          <div className="flex flex-col h-full">
            <SplitPaneHeader label="ターミナル" icon={<Terminal />} onClose={toggleMainLayout} />
            <div className="flex-1 min-h-0">{terminalNode}</div>
          </div>
        </SplitPane>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      <MainTabs children={{ content: contentNode, terminal: terminalNode }} />
    </div>
  )
}
```

**`SplitPaneHeader`（インライン実装・独立コンポーネント不要）:**

```tsx
// MainArea.tsx 内にローカルコンポーネントとして定義
function SplitPaneHeader({
  label,
  icon,
  onClose,
}: {
  label: string
  icon: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between h-9 px-3 flex-shrink-0 ..."
      style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {icon}
        {label}
      </span>
      <button onClick={onClose} ...><X size={14} /></button>
    </div>
  )
}
```

**MainTabs.tsx の変更点:**

```tsx
// Split ボタン追加（タブバー右端）
const mainLayout = useAppStore((s) => s.mainLayout)
const toggleMainLayout = useAppStore((s) => s.toggleMainLayout)

// Ctrl+\ ショートカット追加 + Ctrl+Tab に mainLayout ガード追加
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Tab' && mainLayout === 'tab') {
      e.preventDefault()
      setActiveMainTab(activeMainTab === 'content' ? 'terminal' : 'content')
    }
    if (e.ctrlKey && e.key === '\\') {
      e.preventDefault()
      toggleMainLayout()
    }
  }
  ...
}, [activeMainTab, mainLayout, setActiveMainTab, toggleMainLayout])

// タブバーの右端に Split ボタン
<div className="ml-auto flex items-center pr-2">
  <button onClick={toggleMainLayout} ...>
    <Columns2 size={14} />
  </button>
</div>
```

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `SplitPaneHeader` を独立ファイルにしない | 1-E でのみ使用する小さなコンポーネントのため | `src/components/MainArea/SplitPaneHeader.tsx` として分離（将来的に必要なら移行） |
| `SplitPane` の `defaultSize` を固定 px で指定 | `SplitPane` が % 指定に非対応 | `useRef` でコンテナ幅を取得して動的計算（複雑度が増すため不採用） |
| Split 解除時に `activeMainTab` を変更しない | どちらの `[ ✕ ]` を押してもタブモードに戻るのみ（ユーザー確認済み） | 閉じた側に応じてアクティブタブを変更 |

## 未解決事項

- なし
