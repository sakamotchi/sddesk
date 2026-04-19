# 設計書 - Claude Code スラッシュコマンドサジェスト統合 Phase B

## アーキテクチャ

### 対象コンポーネント

```
Frontend (React/TypeScript)
    │ invoke('list_claude_skills', { projectRoot })
    ▼
Tauri IPC
    │
    ▼
Rust Backend
    │
    ├── src-tauri/src/commands/skills.rs    ← 新規
    │       │
    │       ├── ~/.claude/skills/<name>/SKILL.md      (user)
    │       └── <projectRoot>/.claude/skills/<name>/SKILL.md   (project)
    │
    └── serde_yaml で frontmatter パース
```

### 影響範囲

- **フロントエンド**:
  - `src/lib/tauriApi.ts` — `listSkills` wrapper 追加
  - `src/stores/promptPaletteStore.ts` — `skills` / `skillsLoadedAt` / `loadSkills` 追加
  - `src/components/PromptPalette/PromptPalette.tsx` — `useEffect` での初回ロードトリガー
  - `src/components/PromptPalette/SlashSuggest.tsx` — store の `skills` を `getSlashSuggestCandidates` に渡す
- **バックエンド（Rust）**:
  - `src-tauri/src/commands/skills.rs` — 新規実装
  - `src-tauri/src/commands/mod.rs` — モジュール公開
  - `src-tauri/src/lib.rs` — `invoke_handler` 登録
  - `src-tauri/Cargo.toml` — 依存追加（`serde_yaml`, `dirs`）

---

## 実装方針

### 概要

1. まず **Rust 単体で閉じた実装**（コマンド本体 + 単体テスト）を固める
2. 次に **`tauriApi.listSkills` wrapper** を追加し、型を front/back 共通化
3. **`promptPaletteStore` の `skills` state** を追加。キャッシュ動作を単体テストで確定
4. **`PromptPalette` の初回ロードトリガー** を追加
5. **`SlashSuggest` の候補ソース** を拡張。Phase A で既に用意された UI セクションがそのまま有効化される
6. 手動動作確認で user/project/衝突の 3 パターンを検証

### 詳細

1. `serde_yaml`・`dirs` 依存を追加 (`Cargo.toml`)
2. `src-tauri/src/commands/skills.rs` に `list_claude_skills` と `SkillMetadata` / `SkillKind` / `SkillFrontmatter` を実装
3. `#[cfg(test)] mod tests` で tempdir を使った 6 ケース以上の単体テスト
4. `invoke_handler` 登録と `mod skills;` 宣言
5. `src/lib/tauriApi.ts` の既存オブジェクトに `listSkills` を追加
6. `promptPaletteStore` に 2 state + 1 action + partialize 更新
7. `PromptPalette` で `useEffect(() => { if (isOpen && skillsLoadedAt === null) void loadSkills(projectRoot) }, [isOpen])`
8. `SlashSuggest` の `getSlashSuggestCandidates` 引数に user/project Skill を振り分けて渡す
9. テスト追加・回帰テスト
10. `npx tauri dev` で手動確認

---

## データ構造

### 型定義（TypeScript）

```typescript
// src/lib/slashSuggestItem.ts（Phase A で既出、再掲）
export interface SkillMetadata {
  kind: 'user' | 'project'  // ← Phase B で Rust 側が返す
  name: string
  description?: string
  argumentHint?: string
  path: string
}
```

Phase A 時点の型定義に `kind: 'user' | 'project'` フィールドを明記（Phase A の空配列では実害なし）。

```typescript
// src/stores/promptPaletteStore.ts（追加分）

interface PromptPaletteState {
  // 既存フィールド...

  skills: SkillMetadata[]
  skillsLoadedAt: number | null

  loadSkills: (projectRoot?: string) => Promise<void>
}
```

### 型定義（Rust）

```rust
// src-tauri/src/commands/skills.rs

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SkillKind {
    User,
    Project,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
    pub kind: SkillKind,
    pub name: String,
    pub description: Option<String>,
    pub argument_hint: Option<String>,
    pub path: String,
}

#[derive(Debug, Deserialize, Default)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    #[serde(rename = "argument-hint")]
    argument_hint: Option<String>,
    #[serde(rename = "user-invocable", default = "default_true")]
    user_invocable: bool,
    #[serde(rename = "disable-model-invocation", default)]
    #[allow(dead_code)]
    disable_model_invocation: bool,
}

fn default_true() -> bool {
    true
}

#[tauri::command]
pub fn list_claude_skills(
    project_root: Option<String>,
) -> Result<Vec<SkillMetadata>, String> {
    let home = dirs::home_dir()
        .ok_or_else(|| "HOME directory not resolvable".to_string())?;
    let user_dir = home.join(".claude").join("skills");

    let mut user_skills = scan_skills_dir(&user_dir, SkillKind::User)?;
    let mut project_skills = match project_root.as_ref() {
        Some(root) => {
            let dir = Path::new(root).join(".claude").join("skills");
            scan_skills_dir(&dir, SkillKind::Project)?
        }
        None => vec![],
    };

    // ユーザー側優先で衝突解決
    let user_names: std::collections::HashSet<String> =
        user_skills.iter().map(|s| s.name.clone()).collect();
    project_skills.retain(|s| !user_names.contains(&s.name));

    user_skills.append(&mut project_skills);
    Ok(user_skills)
}

fn scan_skills_dir(
    dir: &Path,
    kind: SkillKind,
) -> Result<Vec<SkillMetadata>, String> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut result = vec![];
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let skill_md = path.join("SKILL.md");
        if !skill_md.exists() {
            continue;
        }
        let dir_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        match read_frontmatter(&skill_md) {
            Ok(fm) => {
                if !fm.user_invocable {
                    continue;
                }
                result.push(SkillMetadata {
                    kind: kind.clone(),
                    name: fm.name.unwrap_or(dir_name),
                    description: fm.description,
                    argument_hint: fm.argument_hint,
                    path: skill_md.to_string_lossy().to_string(),
                });
            }
            Err(e) => {
                log::warn!(
                    "Failed to parse SKILL.md frontmatter at {}: {}",
                    skill_md.display(),
                    e
                );
            }
        }
    }
    Ok(result)
}

fn read_frontmatter(path: &Path) -> Result<SkillFrontmatter, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    // `---\n...\n---` を抽出
    let mut lines = content.lines();
    if lines.next() != Some("---") {
        return Ok(SkillFrontmatter::default());
    }
    let mut yaml = String::new();
    for line in lines {
        if line == "---" {
            break;
        }
        yaml.push_str(line);
        yaml.push('\n');
    }
    serde_yaml::from_str::<SkillFrontmatter>(&yaml).map_err(|e| e.to_string())
}
```

`SkillKind` に `Clone` を derive する必要があるので `#[derive(..., Clone)]` を追加する：

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
```

---

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `list_claude_skills` | `{ projectRoot?: string }` | `Result<Vec<SkillMetadata>, String>` | ユーザー/プロジェクト両方の Skill を列挙、frontmatter パース済み |

### Tauriイベント

本 Phase では追加なし。

---

## UI設計

### UIライブラリ

Phase A で整備した UI（セクション + バッジ）をそのまま使用。追加のライブラリ導入なし。

### カラーパレット

Phase A 準拠。`USER` / `PROJ` バッジは `CMD` / `TPL` と同じ muted 系スタイル。

### 画面構成

```
┌─ /my ──────────────────────────────────┐
│  CLAUDE CODE                            │
│  [CMD] model       Change the model     │
│                                         │
│  USER SKILLS                            │
│  [USER] my-audit   Audit project        │
│                                         │
│  PROJECT SKILLS                         │
│  [PROJ] deploy     Deploy checklist     │
│                                         │
│  TEMPLATES                              │
│  [TPL] my-template ...                  │
└─────────────────────────────────────────┘
```

Phase A の `max-height: 40vh` + `scrollIntoView` はそのまま有効。

### コンポーネント構成

`SlashSuggest` の改修ポイントは `sections` の取得部分のみ：

```tsx
const skills = usePromptPaletteStore((s) => s.skills)
const userSkills = useMemo(() => skills.filter((s) => s.kind === 'user'), [skills])
const projectSkills = useMemo(() => skills.filter((s) => s.kind === 'project'), [skills])

const sections = useMemo(() => {
  if (!isActive) return []
  return getSlashSuggestCandidates({
    templates,
    builtIns: BUILT_IN_COMMANDS,
    userSkills,
    projectSkills,
    query: query ?? '',
    maxPerSection: MAX_PER_SECTION,
  })
}, [isActive, query, templates, userSkills, projectSkills])
```

---

## 状態管理

### Zustandストア変更

```typescript
// src/stores/promptPaletteStore.ts 追加分

skills: [],
skillsLoadedAt: null,

loadSkills: async (projectRoot) => {
  try {
    const list = await tauriApi.listSkills(projectRoot)
    set({ skills: list, skillsLoadedAt: Date.now() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    toast.error(`Skill 一覧の取得に失敗しました: ${message}`)
    // skillsLoadedAt は null のまま維持（次回オープンで再試行可能）
  }
},
```

`partialize` の更新：

```typescript
partialize: (state) => ({
  history: state.history,
  templates: state.templates,
  // skills / skillsLoadedAt は永続化対象外
}),
```

### PromptPalette 側のトリガー

```tsx
// src/components/PromptPalette/PromptPalette.tsx
const isOpen = usePromptPaletteStore((s) => s.isOpen)
const skillsLoadedAt = usePromptPaletteStore((s) => s.skillsLoadedAt)
const activeProjectPath = useAppStore((s) => s.activeProjectPath)

useEffect(() => {
  if (isOpen && skillsLoadedAt === null) {
    void usePromptPaletteStore.getState().loadSkills(activeProjectPath ?? undefined)
  }
}, [isOpen, skillsLoadedAt, activeProjectPath])
```

プロジェクトルートの参照元は `appStore` のアクティブプロジェクトパス。複数プロジェクト切替時は `activeProjectPath` 変更を検知して再スキャンする設計だが、本 Phase では **初回オープン 1 回のみ**とし、切替再スキャンは v1.3 以降で検討。

---

## テストコード

### Reactコンポーネントテスト例

```typescript
// src/stores/promptPaletteStore.test.ts（追加分）

import { tauriApi } from '../lib/tauriApi'
vi.mock('../lib/tauriApi', () => ({
  tauriApi: {
    listSkills: vi.fn<(root?: string) => Promise<SkillMetadata[]>>(),
  },
}))

describe('loadSkills', () => {
  beforeEach(() => {
    usePromptPaletteStore.setState({ skills: [], skillsLoadedAt: null })
    vi.mocked(tauriApi.listSkills).mockReset()
  })

  it('1 回目は IPC を呼び、skills と skillsLoadedAt が更新される', async () => {
    vi.mocked(tauriApi.listSkills).mockResolvedValue([
      { kind: 'user', name: 'my-skill', path: '/u/my-skill/SKILL.md' },
    ])
    await usePromptPaletteStore.getState().loadSkills('/my/project')
    expect(tauriApi.listSkills).toHaveBeenCalledWith('/my/project')
    expect(usePromptPaletteStore.getState().skills).toHaveLength(1)
    expect(usePromptPaletteStore.getState().skillsLoadedAt).not.toBeNull()
  })

  it('IPC 失敗時は skillsLoadedAt が null のままで再試行可能', async () => {
    vi.mocked(tauriApi.listSkills).mockRejectedValueOnce(new Error('boom'))
    await usePromptPaletteStore.getState().loadSkills()
    expect(usePromptPaletteStore.getState().skills).toHaveLength(0)
    expect(usePromptPaletteStore.getState().skillsLoadedAt).toBeNull()
  })
})
```

### Rustテスト例

```rust
// src-tauri/src/commands/skills.rs 内 #[cfg(test)] mod tests

use super::*;
use tempfile::TempDir;
use std::fs;

fn write_skill(dir: &Path, name: &str, frontmatter: &str) {
    let skill_dir = dir.join(name);
    fs::create_dir_all(&skill_dir).unwrap();
    fs::write(
        skill_dir.join("SKILL.md"),
        format!("---\n{}\n---\n# body\n", frontmatter),
    ).unwrap();
}

#[test]
fn reads_user_skills_only() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    let skills_dir = home.path().join(".claude/skills");
    write_skill(&skills_dir, "a", "name: a\ndescription: A");
    write_skill(&skills_dir, "b", "name: b\ndescription: B");

    let result = list_claude_skills(None).unwrap();
    assert_eq!(result.len(), 2);
    assert!(result.iter().all(|s| matches!(s.kind, SkillKind::User)));
}

#[test]
fn merges_user_and_project_skills() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    write_skill(&home.path().join(".claude/skills"), "u1", "name: u1");

    let project = TempDir::new().unwrap();
    write_skill(&project.path().join(".claude/skills"), "p1", "name: p1");

    let result =
        list_claude_skills(Some(project.path().to_string_lossy().into()))
            .unwrap();
    assert_eq!(result.len(), 2);
}

#[test]
fn resolves_name_collision_user_wins() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    write_skill(&home.path().join(".claude/skills"), "dup", "name: dup\ndescription: U");

    let project = TempDir::new().unwrap();
    write_skill(&project.path().join(".claude/skills"), "dup", "name: dup\ndescription: P");

    let result =
        list_claude_skills(Some(project.path().to_string_lossy().into()))
            .unwrap();
    assert_eq!(result.len(), 1);
    assert!(matches!(result[0].kind, SkillKind::User));
    assert_eq!(result[0].description.as_deref(), Some("U"));
}

#[test]
fn excludes_non_user_invocable() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    write_skill(
        &home.path().join(".claude/skills"),
        "hidden",
        "name: hidden\nuser-invocable: false",
    );
    write_skill(
        &home.path().join(".claude/skills"),
        "visible",
        "name: visible",
    );

    let result = list_claude_skills(None).unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].name, "visible");
}

#[test]
fn handles_missing_directory() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    // スキル dir を作らない
    let result = list_claude_skills(None).unwrap();
    assert_eq!(result.len(), 0);
}

#[test]
fn skips_broken_yaml() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    // broken
    let broken_dir = home.path().join(".claude/skills/broken");
    fs::create_dir_all(&broken_dir).unwrap();
    fs::write(broken_dir.join("SKILL.md"), "---\nname: [unclosed\n---\n").unwrap();
    // ok
    write_skill(&home.path().join(".claude/skills"), "ok", "name: ok");

    let result = list_claude_skills(None).unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].name, "ok");
}

#[test]
fn uses_directory_name_when_frontmatter_has_no_name() {
    let home = TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    write_skill(&home.path().join(".claude/skills"), "dir-only", "description: only");

    let result = list_claude_skills(None).unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].name, "dir-only");
}
```

**注意**: `std::env::set_var("HOME", ...)` はプロセスグローバル。テストを `cargo test` で並列実行すると干渉するため、`#[test]` には `serial_test` クレートか `#[cfg(test)] static LOCK: Mutex<()> = ...` での逐次化を検討。本 Phase では `-- --test-threads=1` 指示をテスト手順書に明記する運用で回避。

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| スキャンはパレット初回オープン時の 1 回のみ | ユーザーが毎回待たない、IPC 呼び出し削減 | 起動時にプリロード → 起動時間増、使わないユーザーでも IPC が動く / fs watch → 複雑度増 |
| 衝突解決は Rust 側で実施 | フロント（`getSlashSuggestCandidates`）に重複データが届かず、メモリ・レンダリングを節約 | フロント側で解決 → 既に衝突解決ロジックが Phase A に存在するが、Rust 側で早期に絞る方がデータフロー単純 |
| `skills` は永続化しない | SKILL.md の内容がファイル変更されても次回セッションに残らない問題を避ける | 永続化 → 古い情報を出す可能性、セキュリティ懸念（`path` がローカルパス） |
| `dirs` クレート採用 | `std::env::var("HOME")` では Windows の `%USERPROFILE%` を扱えない | `std::env` で OS 分岐を自前実装 → 保守コスト増 |
| YAML パースは簡易正規表現ではなく `serde_yaml` | 将来の複雑な frontmatter（リスト、ネスト）に対応、公式 SKILL.md 仕様互換 | 正規表現 → エッジケースで破綻 |
| frontmatter 無しは未起動扱い | SKILL.md が存在すれば Skill ディレクトリとして認識、name はディレクトリ名から | 無視 → 古い形式 SKILL.md を拾えない |
| `kind` を `user` / `project` のみ（Phase A の型は `user-skill` / `project-skill`） | Rust 側は短く、TS 側の判別共用体との変換は `tauriApi.listSkills` wrapper で行う | 同じ文字列にする → 内部命名と判別共用体タグ名を分離した方が変更耐性が高い |

---

## 未解決事項

- [ ] Skill が多数（数百件）ある環境での初回ロードレイテンシを手動測定する。200ms を超える場合は `rayon` で並列化を検討
- [ ] Windows 環境での動作確認（`dirs::home_dir()` で `%USERPROFILE%` が解決されること）。CI 非対応のため、Windows 環境を持つメンバーに依頼
- [ ] プロジェクトパス切替時の再スキャンは v1.3 以降の拡張課題として残す。ユーザーから要望が上がったら着手
- [ ] `argument-hint` の UI 表示（候補行右端の description と併記、または別行）は v1.3 以降で検討
- [ ] 手動リロードボタン（SKILL.md を編集後に即反映）は v1.3 以降で検討
