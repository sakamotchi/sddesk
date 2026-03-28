# 設計書 - Phase 1-D: 状態管理基盤（Zustand persist）

## アーキテクチャ

### 対象コンポーネント

```
Frontend (React/TypeScript)
    appStore (Zustand + persist middleware)
        ↓ JSON.stringify / JSON.parse（カスタムシリアライザー）
    localStorage
        キー: "spec-prompt-app-store"
```

### 影響範囲

- **フロントエンド**: `appStore.ts` のみ変更
- **バックエンド（Rust）**: 変更なし

---

## 実装方針

### 概要

`zustand/middleware` の `persist` を `appStore` に適用し、`projectRoot` / `selectedFile` / `expandedDirs` / `activeMainTab` を localStorage に保存する。`fileTree` は再取得するため永続化しない（`partialize` で除外）。

`expandedDirs: Set<string>` は JSON 非対応なので、`storage` オプションにカスタム `getItem` / `setItem` を渡して `Set ↔ Array` の変換を行う。

### 詳細

1. `create<AppState>()(persist(..., options))` の形に変更する
2. `partialize` で `fileTree` を除外する
3. カスタム `storage` で `expandedDirs` を `Array → Set` に復元する

---

## データ構造

### 永続化対象フィールド

| フィールド | 型 | 永続化 | 理由 |
|-----------|---|--------|------|
| `activeMainTab` | `'content' \| 'terminal'` | ✅ | 前回のタブを復元 |
| `projectRoot` | `string \| null` | ✅ | 前回のプロジェクトを復元 |
| `selectedFile` | `string \| null` | ✅ | 前回の選択ファイルを復元 |
| `expandedDirs` | `Set<string>` | ✅ | ツリーの展開状態を復元 |
| `fileTree` | `FileNode[]` | ❌ | 起動時に再取得するため不要 |

### localStorage の保存形式

```json
{
  "state": {
    "activeMainTab": "content",
    "projectRoot": "/Users/xxx/my-project",
    "selectedFile": "/Users/xxx/my-project/README.md",
    "expandedDirs": ["/Users/xxx/my-project/src", "/Users/xxx/my-project/docs"]
  },
  "version": 0
}
```

`expandedDirs` は保存時に `Array<string>` に変換し、読み込み時に `Set<string>` に戻す。

---

## 状態管理

### appStore の変更

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FileNode } from '../lib/tauriApi'

// ...型定義は変更なし...

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ...アクションは変更なし...
    }),
    {
      name: 'spec-prompt-app-store',
      // fileTree は永続化しない
      partialize: (state) => ({
        activeMainTab: state.activeMainTab,
        projectRoot: state.projectRoot,
        selectedFile: state.selectedFile,
        expandedDirs: state.expandedDirs,
      }),
      // Set<string> を Array<string> に変換して保存・復元
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) =>
          value instanceof Set ? { __type: 'Set', values: [...value] } : value,
        reviver: (_key, value) => {
          if (
            value !== null &&
            typeof value === 'object' &&
            (value as { __type?: string }).__type === 'Set'
          ) {
            return new Set((value as { values: string[] }).values)
          }
          return value
        },
      }),
    }
  )
)
```

---

## テストコード

### appStore persist テスト

```typescript
describe('appStore persist', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      activeMainTab: 'content',
      projectRoot: null,
      fileTree: [],
      selectedFile: null,
      expandedDirs: new Set(),
    })
  })

  it('projectRoot を設定すると localStorage に保存される', () => {
    useAppStore.getState().setProjectRoot('/my/project')
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    expect(saved.state.projectRoot).toBe('/my/project')
  })

  it('expandedDirs の Set が正しくシリアライズ・デシリアライズされる', () => {
    useAppStore.getState().toggleExpandedDir('/my/project/src')
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    // Array として保存されていること
    expect(saved.state.expandedDirs).toEqual({
      __type: 'Set',
      values: ['/my/project/src'],
    })
  })

  it('fileTree は localStorage に保存されない', () => {
    useAppStore.getState().setFileTree([{ name: 'test', path: '/test', is_dir: false }])
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    expect(saved.state.fileTree).toBeUndefined()
  })
})
```

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `localStorage` を使用 | Tauri WebView で標準利用可能、追加プラグイン不要 | `tauri-plugin-store`（Phase 2-F で移行検討） |
| `replacer` / `reviver` で Set 変換 | `createJSONStorage` の標準オプションで完結できる | `partialize` で Array に変換してから保存（型安全性が低い） |
| `terminalStore` は persist しない | PTY はセッションごとに再起動が必要なため復元しても無意味 | タブ名のみ保存（UX 向上は小さく複雑度が増すため不採用） |

## 未解決事項

- なし
