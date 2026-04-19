# テスト手順書 - Claude Code スラッシュコマンドサジェスト統合 Phase B

## 概要

Phase B（ユーザー/プロジェクト Skill のファイルスキャン）のテスト手順書。Rust 側単体テストと、手動での実機確認を組み合わせる。

## 前提条件

- Phase A がマージ済み（`feature/claude-code-slash-commands` ブランチまたは main）で、組み込みコマンドセクションがすでに表示される状態
- `npx tauri dev` でアプリが起動していること
- テスト対象のプロジェクトフォルダが準備されていること
- テスト用 Skill ディレクトリを `~/.claude/skills/` および `<projectRoot>/.claude/skills/` に一時的に作成できる環境

## テスト用フィクスチャ

開始前に以下を作成する（テスト終了後に削除推奨）:

```bash
# ユーザー Skill
mkdir -p ~/.claude/skills/test-user-a
cat > ~/.claude/skills/test-user-a/SKILL.md <<'EOF'
---
name: test-user-a
description: User-scope test skill A
---
# body
EOF

mkdir -p ~/.claude/skills/test-user-hidden
cat > ~/.claude/skills/test-user-hidden/SKILL.md <<'EOF'
---
name: test-user-hidden
user-invocable: false
description: Should NOT appear
---
EOF

# プロジェクト Skill（プロジェクトルートで実行）
mkdir -p .claude/skills/test-project-a
cat > .claude/skills/test-project-a/SKILL.md <<'EOF'
---
name: test-project-a
description: Project-scope test skill
---
EOF

# 衝突テスト用（ユーザー優先）
mkdir -p ~/.claude/skills/collide
cat > ~/.claude/skills/collide/SKILL.md <<'EOF'
---
name: collide
description: USER wins
---
EOF

mkdir -p .claude/skills/collide
cat > .claude/skills/collide/SKILL.md <<'EOF'
---
name: collide
description: PROJECT loses
---
EOF

# broken YAML
mkdir -p ~/.claude/skills/broken
cat > ~/.claude/skills/broken/SKILL.md <<'EOF'
---
name: [unclosed
---
EOF
```

## 手動テスト

### ケース 1: ユーザー Skill セクションが表示される

**手順:**

1. アプリを再起動し、テスト対象プロジェクトを開く
2. `Cmd+Shift+P` でパレットを開き、`/` を入力

**期待結果:**

- `Claude Code` セクションの下に `User Skills` セクションが出現する
- `User Skills` セクションに `test-user-a` が表示される（description: "User-scope test skill A"）
- `USER` バッジが付く

**確認結果:**

- [ ] OK / NG

---

### ケース 2: プロジェクト Skill セクションが表示される

**手順:**

1. ケース 1 の続き

**期待結果:**

- `User Skills` セクションの下に `Project Skills` セクションが出現する
- `Project Skills` に `test-project-a` が表示される
- `PROJ` バッジが付く

**確認結果:**

- [ ] OK / NG

---

### ケース 3: 同名衝突はユーザー側が優先

**手順:**

1. `/coll` と入力

**期待結果:**

- `User Skills` セクションに `collide` が表示される（description: "USER wins"）
- `Project Skills` セクションには `collide` が **表示されない**（または section 自体が非表示）

**確認結果:**

- [ ] OK / NG

---

### ケース 4: `user-invocable: false` は除外

**手順:**

1. `/test-user-h` で絞り込み

**期待結果:**

- `test-user-hidden` は候補に出ない（`user-invocable: false` のため）

**確認結果:**

- [ ] OK / NG

---

### ケース 5: broken YAML があっても他が表示される

**手順:**

1. パレットを一度閉じ、`~/.claude/skills/broken/` が存在する状態で再度開く

**期待結果:**

- `broken` は候補に出ない（パース失敗）
- 他のスキル（`test-user-a` など）は通常通り表示される
- toast エラーは出ない（ログには `warn` が残る想定）

**確認結果:**

- [ ] OK / NG

---

### ケース 6: Skill 選択時の挿入

**手順:**

1. `/test-user-a` を絞り込み
2. `↓` で合わせて `Enter`（または `Tab`）

**期待結果:**

- draft が `/test-user-a ` に置換される（末尾スペース）
- 送信はされない
- textarea にフォーカスが残る

**確認結果:**

- [ ] OK / NG

---

### ケース 7: キャッシュ動作（2 回目は IPC 呼ばない）

**手順:**

1. ケース 1 終了後、パレットを閉じて再度開く
2. 開発者ツールの Network タブまたは Rust のログで `list_claude_skills` が呼ばれないことを確認

**期待結果:**

- 2 回目のオープンは IPC を呼ばず、即座にキャッシュされた候補が表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 8: Skill 追加後のリロード（運用確認）

**手順:**

1. アプリ起動中に `~/.claude/skills/added-after/SKILL.md` を新規作成
2. パレットを閉じて再度開く

**期待結果:**

- 新しく追加した Skill は **初回オープン済みのためキャッシュヒット** で反映されない（仕様通り・制約）
- アプリを再起動すると反映される

**確認結果:**

- [ ] OK / NG

---

### ケース 9: `~/.claude/skills/` が存在しない環境

**手順:**

1. テスト用環境で `~/.claude/skills/` を一時的にリネームまたは削除
2. アプリを再起動しパレットを開く

**期待結果:**

- `User Skills` セクションは非表示（空配列）
- `Claude Code` / `Project Skills` / `Templates` は通常通り表示される
- エラートーストは出ない

**確認結果:**

- [ ] OK / NG

---

### ケース 10: Skill 多数時の応答性

**手順:**

1. `~/.claude/skills/` に 50〜100 件程度の SKILL.md を用意（スクリプトで自動生成可）
2. パレットを初回オープン

**期待結果:**

- パレットが開いてから候補表示まで、体感で遅延がない（200ms 以内を目安）
- スクロール追従（PE-48）が機能し、全件に到達できる

**確認結果:**

- [ ] OK / NG

---

## 自動テスト

### フロントエンドテスト（Vitest）

```bash
npm run test
```

対象:

- `src/stores/promptPaletteStore.test.ts` — `loadSkills` のキャッシュ動作 / 失敗時フォールバック
- `src/components/PromptPalette/SlashSuggest.test.tsx` — User/Project Skill セクションの描画回帰
- `src/components/PromptPalette/PromptPalette.test.tsx` — 初回オープン時の `loadSkills` トリガー

### 型チェック

```bash
npm run build
```

TypeScript エラーがないこと。

### Lint

```bash
npm run lint
```

ESLint 警告がないこと。

### Rust テスト

```bash
cd src-tauri && cargo test
# 並列 HOME 干渉時は以下
cd src-tauri && cargo test -- --test-threads=1
```

対象ケース（`commands::skills::tests`）:

- `reads_user_skills_only`
- `merges_user_and_project_skills`
- `resolves_name_collision_user_wins`
- `excludes_non_user_invocable`
- `handles_missing_directory`
- `skips_broken_yaml`
- `uses_directory_name_when_frontmatter_has_no_name`

### Rust 型チェック

```bash
cd src-tauri && cargo check
```

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| SKILL.md に frontmatter 自体がない | 無視（Phase B では frontmatter 必須と見なす） | [ ] OK / NG |
| SKILL.md の frontmatter に `name` のみ | description 非表示で `name` のみ表示 | [ ] OK / NG |
| スキル ディレクトリに `SKILL.md` でなく `skill.md` しかない | 無視（ファイル名は大文字固定） | [ ] OK / NG |
| SKILL.md 以外のファイルが同居 | 無視（SKILL.md 以外は読まない） | [ ] OK / NG |
| プロジェクトルート未解決（activeProjectPath が undefined） | ユーザー Skill のみ返る | [ ] OK / NG |
| ネストした skills（`~/.claude/skills/foo/bar/SKILL.md`） | 無視（直下 1 階層のみスキャン） | [ ] OK / NG |

---

## 回帰テスト

既存機能への影響がないことを確認します。

- [ ] Phase A の体験が維持される（`Claude Code` セクション・`Templates` セクションが従来通り）
- [ ] Tab キー確定・スクロール追従（PE-47 / PE-48）が正常動作
- [ ] ファイルツリー・ターミナル・コンテンツビューアに影響なし
- [ ] プロンプト履歴・テンプレート編集（v1.1）が従来通り動作
- [ ] パス挿入（`Cmd+Click` / 右クリック / `Ctrl+P`）がパレット開時 textarea に挿入される
- [ ] `⌘Enter` 送信・履歴追加が従来通り
- [ ] Esc でパレット閉じる挙動
- [ ] ステータスバーの Git ブランチ・ファイル種別表示

## 後片付け

テスト完了後、フィクスチャを削除:

```bash
rm -rf ~/.claude/skills/test-user-a ~/.claude/skills/test-user-hidden \
       ~/.claude/skills/collide ~/.claude/skills/broken ~/.claude/skills/added-after
rm -rf <projectRoot>/.claude/skills/test-project-a <projectRoot>/.claude/skills/collide
```
