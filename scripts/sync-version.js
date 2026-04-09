#!/usr/bin/env node

/**
 * バージョン同期スクリプト
 * package.json のバージョンを tauri.conf.json と Cargo.toml に同期する
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// package.json からバージョンを取得
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
const version = packageJson.version

console.log(`Syncing version: ${version}`)

// tauri.conf.json を更新
const tauriConfigPath = join(rootDir, 'src-tauri', 'tauri.conf.json')
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'))
const oldTauriVersion = tauriConfig.version
tauriConfig.version = version
writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n')
console.log(`  tauri.conf.json: ${oldTauriVersion} -> ${version}`)

// Cargo.toml を更新
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml')
let cargoToml = readFileSync(cargoTomlPath, 'utf-8')
const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)
const oldCargoVersion = versionMatch ? versionMatch[1] : 'unknown'
cargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`)
writeFileSync(cargoTomlPath, cargoToml)
console.log(`  Cargo.toml: ${oldCargoVersion} -> ${version}`)

console.log('Version sync complete!')
