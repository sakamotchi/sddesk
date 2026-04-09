# コンテンツビューア機能仕様書

**バージョン**: 1.0
**作成日**: 2026年3月28日
**最終更新**: 2026年3月28日

---

## 1. 概要

コンテンツビューアは、選択したファイルの内容を右ペインに表示します。ファイルの種類（拡張子）に応じてマークダウンプレビュー、シンタックスハイライト付きコード表示、プレーンテキスト表示を自動切り替えします。

**機能ID**: FR-02, FR-07

---

## 2. 機能要件

### 2.1 表示モード自動判定

| 拡張子 | 表示モード | コンポーネント |
|--------|-----------|---------------|
| `.md`, `.mdx` | マークダウンプレビュー | `MarkdownPreview` |
| `.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, `.py`, `.go`, `.json`, `.toml`, `.yaml`, `.yml` 等 | コードビューア | `CodeViewer` |
| その他テキスト | プレーンテキストビューア | `PlainTextViewer` |

### 2.2 マークダウンプレビュー（FR-02）

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| CV-01 | MDレンダリング | `unified` (remark + rehype) でMarkdown → HTMLに変換して表示する |
| CV-02 | Mermaidダイアグラム | Mermaidのコードブロック（` ```mermaid `）をSVGにレンダリングする |
| CV-03 | コードハイライト | MDファイル内のコードブロックをShikiでシンタックスハイライトする |
| CV-04 | テーブル | GFM（GitHub Flavored Markdown）のテーブルをHTMLテーブルとして表示する |
| CV-05 | リンク | リンクはデフォルトブラウザで開く（Tauri `opener` プラグイン使用） |

### 2.3 コードビューア（FR-07）

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| CV-06 | シンタックスハイライト | Shikiを使って言語に応じたシンタックスハイライトを表示する |
| CV-07 | 読み取り専用 | コードビューアはテキスト編集不可（表示専用） |
| CV-08 | 行番号表示 | 行番号を左端に表示する |
| CV-09 | 言語自動判定 | ファイルの拡張子から言語を自動判定する |

### 2.4 自動更新

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| CV-10 | ファイル変更検知 | バックエンドの `file-changed` イベントを受け取ったとき、現在表示中のファイルなら自動で再読み込みする |
| CV-11 | 更新遅延 | 500ms以内に表示が更新されること（NFR-03） |

### 2.5 複数タブ・分割表示

| 要件ID | 要件 | 詳細 |
|--------|------|------|
| CV-12 | 複数タブ | 複数のファイルをタブで同時に開くことができる |
| CV-13 | タブ切り替え | タブクリックでファイルを切り替える |
| CV-14 | タブ追加 | ファイルツリーからファイルをクリックすると新しいタブまたは既存タブで開く |
| CV-15 | タブ閉じる | 「×」ボタンまたは `Ctrl+W` でタブを閉じる |
| CV-16 | 水平分割 | コンテンツを左右に2分割して別々のファイルを表示できる |
| CV-17 | 垂直分割 | コンテンツを上下に2分割して別々のファイルを表示できる |

---

## 3. 技術仕様

### 3.1 フロントエンド

**コンポーネント**: `src/components/ContentView/`

- `ContentTabs.tsx`: タブ管理UI・分割表示制御
- `MarkdownPreview.tsx`: unifiedパイプラインでMD → HTML変換・表示
- `CodeViewer.tsx`: Shikiでシンタックスハイライト表示
- `PlainTextViewer.tsx`: プレーンテキスト表示

**MDレンダリングパイプライン** (`src/lib/markdown.ts`):

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, { theme: 'github-dark' })
  .use(rehypeStringify)
```

**表示モード判定ロジック**:

```typescript
function getViewMode(filePath: string): ViewMode {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'mdx') return 'markdown'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  return 'plain'
}
```

**ファイル変更イベント処理**:

```typescript
// appStore または ContentView コンポーネント内で
listen('file-changed', ({ payload }) => {
  if (payload.path === currentOpenFile) {
    readFile(payload.path).then(setContent)
  }
})
```

### 3.2 状態管理

**ストア**: `src/stores/contentStore.ts`

```typescript
interface ContentTab {
  id: string
  filePath: string
  content: string
  viewMode: ViewMode
  isActive: boolean
}

interface ContentState {
  tabs: ContentTab[]
  activeTabId: string | null
  splitLayout: SplitLayout | null
}

type ViewMode = 'markdown' | 'code' | 'plain'
```

---

## 4. パフォーマンス考慮事項

- 大きなファイルのレンダリングは非同期（`useEffect` + `async/await`）で行う
- Shikiのハイライト処理はコストが高いため、`useMemo` でキャッシュする
- Mermaidレンダリングは動的インポートで遅延読み込みする

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-03-28 | 1.0 | 初版作成 | - |
