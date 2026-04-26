# Scripts

開発・リリース用のユーティリティスクリプト集です。

## release.js

リリース作業を一括で実行するスクリプトです。

### 使い方

```bash
# ドライラン（実行内容を確認のみ）
npm run release -- --dry-run patch

# パッチリリース (0.1.0 → 0.1.1)
npm run release -- patch

# マイナーリリース (0.1.0 → 0.2.0)
npm run release -- minor

# メジャーリリース (0.1.0 → 1.0.0)
npm run release -- major

# 特定バージョンを指定
npm run release -- 1.2.3
```

### 実行される処理

1. 未コミットの変更がないかチェック
2. 現在のブランチを確認（main/master以外の場合は警告）
3. `package.json` のバージョン更新
4. `tauri.conf.json` と `Cargo.toml` にバージョン同期
5. コミット作成 (`release: vX.Y.Z`)
6. タグ作成 (`vX.Y.Z`)
7. リモートにpush（コミット + タグ）

### 前提条件

- 未コミットの変更がないこと
- リモートリポジトリへのpush権限があること

---

## sync-version.js

`package.json` のバージョンを他の設定ファイルに同期するスクリプトです。

### 使い方

```bash
npm run version:sync
```

### 同期先

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### 備考

このスクリプトは `npm version` のライフサイクルフックで自動実行されるため、通常は直接実行する必要はありません。`release.js` を使用してください。

---

## extract-changelog.js

`CHANGELOG.md` から指定バージョンのセクション本文を抽出して標準出力に書き出します。
GitHub Actions の `release.yml` から呼ばれ、tauri-action の `releaseBody` として
GitHub Release ページの説明文に流し込まれます。

### 使い方

```bash
node scripts/extract-changelog.js 0.3.4
node scripts/extract-changelog.js v0.3.4   # 先頭 'v' は許容
```

### 動作

- `## [x.y.z]` 行から次の `## [` 行の手前までを切り出す
- 該当セクションが存在しない / 空 / CHANGELOG.md が読めないなどの異常系では、
  フォールバック文言（commit history へのリンク）を出力して exit 0 する
  - 抽出失敗で workflow を落とさないため
