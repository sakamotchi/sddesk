#!/usr/bin/env node

/**
 * CHANGELOG.md から指定バージョンのセクションを抽出する。
 *
 * 使い方:
 *   node scripts/extract-changelog.js 0.3.4
 *   node scripts/extract-changelog.js v0.3.4   # 先頭 'v' は許容
 *
 * 該当セクションが見つからない場合はフォールバック文言を出力して exit 0 する。
 * （release.yml から呼ぶため、抽出失敗で workflow を落とさない方針）
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node scripts/extract-changelog.js <version>')
  process.exit(1)
}

const version = arg.replace(/^v/, '')
const changelogPath = join(rootDir, 'CHANGELOG.md')

const fallback = (reason) => {
  // tauri-action の releaseBody に渡される。改行を含めて出力する。
  process.stdout.write(
    `## What's Changed\n\n` +
      `_${reason}_\n\n` +
      `See the [commit history](https://github.com/sakamotchi/sddesk/commits/v${version}) for details.\n`,
  )
  process.exit(0)
}

let content
try {
  content = readFileSync(changelogPath, 'utf-8')
} catch (e) {
  fallback(`CHANGELOG.md not found: ${e.message}`)
}

// `## [x.y.z]` セクションの開始位置を探す（バージョン番号は厳密一致）
// 例: "## [0.3.4] - 2026-04-26"
const startRe = new RegExp(`^## \\[${escapeRegex(version)}\\][^\\n]*$`, 'm')
const startMatch = content.match(startRe)
if (!startMatch) {
  fallback(`CHANGELOG entry for v${version} not found.`)
}

const startIdx = startMatch.index + startMatch[0].length
const rest = content.slice(startIdx)

// 次の `## [` で始まる行（次バージョン or [Unreleased]）の手前までを切り出す
const endRe = /^## \[/m
const endMatch = rest.match(endRe)
const body = endMatch ? rest.slice(0, endMatch.index) : rest

const trimmed = body.trim()
if (!trimmed) {
  fallback(`CHANGELOG entry for v${version} is empty.`)
}

// GitHub Release 用に体裁を整える
process.stdout.write(`## What's Changed\n\n${trimmed}\n`)

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
