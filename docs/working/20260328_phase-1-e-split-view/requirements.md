# 要件定義書 - Phase 1-E: 右ペイン分割表示（Split View）

## 概要

右ペインにコンテンツとターミナルを横並び同時表示する「Split モード」を追加する。タブバー右端の Split ボタン（`Columns2` アイコン）または `Ctrl+\` でタブモードと Split モードをトグル切り替えできる。

## 背景・目的

現在の右ペインはコンテンツ / ターミナルをタブで切り替える形式のみ。コードを参照しながら AI CLI を操作するユースケースでは、コンテンツとターミナルを同時に見たい需要がある。Split View を追加することで画面を離れずに両者を確認できるようになる。

詳細な画面イメージ・確認済み仕様は `docs/local/20260328-初期開発ドキュメント/04_split-view-proposal.md` を参照。

## 要件一覧

### 機能要件

#### F-1: Split モードの切り替え

- **説明**: タブモードと Split モードをワンアクションで切り替える
- **受け入れ条件**:
  - [ ] タブバー右端の `Columns2` アイコンボタンをクリックすると Split モードに切り替わる
  - [ ] `Ctrl+\` キーでも同様にトグル切り替えができる
  - [ ] Split モード中に同ボタン / `Ctrl+\` を押すとタブモードに戻る
  - [ ] Split モード中は Split ボタンがアクティブ状態（`--color-accent`）で表示される

#### F-2: Split モードのレイアウト

- **説明**: 左にコンテンツ・右にターミナルを横並びで表示する
- **受け入れ条件**:
  - [ ] 既存の `SplitPane` コンポーネントを使い、左:コンテンツ / 右:ターミナルを横並び表示する
  - [ ] デフォルト分割比は 50:50（コンテナ幅の半分）
  - [ ] セパレーターをドラッグしてリサイズできる
  - [ ] 各ペインにヘッダーバー（「📄 コンテンツ」「> ターミナル」+ `[ ✕ ]` ボタン）を表示する

#### F-3: Split 解除

- **説明**: Split モード中の `[ ✕ ]` ボタンでタブモードに戻る
- **受け入れ条件**:
  - [ ] 左ペイン（コンテンツ）の `[ ✕ ]` を押すとタブモードに戻る
  - [ ] 右ペイン（ターミナル）の `[ ✕ ]` を押すとタブモードに戻る
  - [ ] どちらの `[ ✕ ]` を押しても `activeMainTab` は変更しない（タブモードに戻るのみ）

#### F-4: タブモードでの `Ctrl+Tab` 継続動作

- **説明**: タブモード中の `Ctrl+Tab` は従来通り動作する
- **受け入れ条件**:
  - [ ] `mainLayout === 'tab'` の時のみ `Ctrl+Tab` でコンテンツ ↔ ターミナルを切り替える
  - [ ] `mainLayout === 'split'` の時は `Ctrl+Tab` を無効化する

### 非機能要件

- **外観・デザイン**: Split ペインのヘッダーバーは `--color-bg-elevated` 背景 + `--color-border` 下線。カラーパレット CSS カスタムプロパティを使用
- **保守性**: Split レンダリングのロジックは `MainArea.tsx` に集約し、`MainTabs.tsx` はタブバーのみ担当する

## スコープ

### 対象

- `src/components/MainArea/MainArea.tsx`（Split レンダリングを追加）
- `src/components/MainArea/MainTabs.tsx`（Split ボタン・`Ctrl+\` ショートカット追加）

### 対象外

- `appStore.ts` の変更（`mainLayout` / `toggleMainLayout` は Phase 1-D で実装済み）
- コンテンツビューアの実装（Phase 2-A）
- Split モードの状態永続化（`mainLayout` は既に persist 対象）

## 実装対象ファイル（予定）

- `src/components/MainArea/MainArea.tsx`
- `src/components/MainArea/MainTabs.tsx`

## 依存関係

- Phase 1-A が完了していること（`SplitPane` コンポーネントが実装済み）
- Phase 1-D が完了していること（`mainLayout` / `toggleMainLayout` が `appStore` に実装済み）

## 既知の制約

- `SplitPane` の `defaultSize` は px 指定のため、コンテナ幅に応じた 50% 指定はできない。コンテナ幅を `useRef` で取得するか、初期値として適切な固定値（例: 500px）を設定する
- Split モードではターミナルタブバー（`TerminalTabs`）がそのまま右ペイン内に表示される

## 参考資料

- `docs/local/20260328-初期開発ドキュメント/04_split-view-proposal.md` - 画面イメージ・確認済み仕様
- `src/components/SplitPane/SplitPane.tsx` - 既存の分割コンポーネント
- `src/stores/appStore.ts` - `mainLayout` / `toggleMainLayout` 実装済み
