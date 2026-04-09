#!/usr/bin/env node

/**
 * リリーススクリプト
 * バージョン更新、同期、タグ作成、pushを一括実行する
 *
 * 使い方:
 *   node scripts/release.js patch   # 0.1.0 -> 0.1.1
 *   node scripts/release.js minor   # 0.1.0 -> 0.2.0
 *   node scripts/release.js major   # 0.1.0 -> 1.0.0
 *   node scripts/release.js 1.2.3   # 指定バージョンに設定
 *   node scripts/release.js --dry-run patch  # 実行内容を確認（実際には実行しない）
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// 引数をパース
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const versionArg = args.find((arg) => !arg.startsWith('--'))

if (!versionArg) {
  console.error('使い方: node scripts/release.js [--dry-run] <patch|minor|major|x.y.z>')
  console.error('')
  console.error('例:')
  console.error('  node scripts/release.js patch      # パッチバージョンを上げる')
  console.error('  node scripts/release.js minor      # マイナーバージョンを上げる')
  console.error('  node scripts/release.js major      # メジャーバージョンを上げる')
  console.error('  node scripts/release.js 1.2.3      # 指定バージョンに設定')
  console.error('  node scripts/release.js --dry-run patch  # 実行内容を確認のみ')
  process.exit(1)
}

// 現在のバージョンを取得
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
const currentVersion = packageJson.version

// 新しいバージョンを計算
function getNextVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      // セマンティックバージョン形式かチェック
      if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(type)) {
        return type
      }
      throw new Error(`無効なバージョン指定: ${type}`)
  }
}

const nextVersion = getNextVersion(currentVersion, versionArg)

console.log('')
console.log('📦 リリース準備')
console.log('================')
console.log(`  現在のバージョン: ${currentVersion}`)
console.log(`  新しいバージョン: ${nextVersion}`)
console.log(`  タグ: v${nextVersion}`)
console.log('')

if (dryRun) {
  console.log('🔍 ドライラン モード（実際には実行しません）')
  console.log('')
  console.log('実行されるコマンド:')
  console.log(`  1. npm version ${versionArg} -m "release: v%s"`)
  console.log('     - テスト実行 (preversion)')
  console.log('     - バージョン同期: package.json -> tauri.conf.json, Cargo.toml (version)')
  console.log('     - Rust ビルドチェック (version)')
  console.log('     - git push && git push --tags (postversion)')
  console.log('')
  console.log('これにより GitHub Actions のリリースワークフローが起動します。')
  process.exit(0)
}

// 未コミットの変更がないか確認
try {
  const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8' })
  if (status.trim()) {
    console.error('❌ エラー: 未コミットの変更があります')
    console.error('')
    console.error('以下のファイルをコミットまたはスタッシュしてください:')
    console.error(status)
    process.exit(1)
  }
} catch {
  console.error('❌ git status の実行に失敗しました')
  process.exit(1)
}

// mainブランチにいるか確認
try {
  const branch = execSync('git branch --show-current', { cwd: rootDir, encoding: 'utf-8' }).trim()
  if (branch !== 'main') {
    console.warn(`⚠️  警告: 現在のブランチは "${branch}" です（main ではありません）`)
    console.warn('')
  }
} catch {
  // ブランチ確認に失敗しても続行
}

// リリース実行
console.log('🚀 リリースを実行中...')
console.log('')

try {
  execSync(`npm version ${versionArg} -m "release: v%s"`, {
    cwd: rootDir,
    stdio: 'inherit'
  })

  console.log('')
  console.log('✅ リリース完了!')
  console.log('')
  console.log(`   バージョン: v${nextVersion}`)
  console.log('   GitHub Actions でビルドが開始されます。')
  console.log('   進捗: https://github.com/sakamotchi/spec-prompt/actions')
  console.log('')
} catch (error) {
  console.error('')
  console.error('❌ リリースに失敗しました')
  console.error(error.message)
  process.exit(1)
}
