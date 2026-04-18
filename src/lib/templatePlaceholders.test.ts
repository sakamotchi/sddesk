import { describe, it, expect } from 'vitest'
import { parsePlaceholders, findNextPlaceholder } from './templatePlaceholders'

describe('parsePlaceholders', () => {
  it('プレースホルダを位置付きで返す', () => {
    const body = 'Hello {{name}}, path: {{path}}'
    const result = parsePlaceholders(body)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ start: 6, end: 14, name: 'name' })
    expect(result[1]).toEqual({ start: 22, end: 30, name: 'path' })
  })

  it('プレースホルダがない場合は空配列', () => {
    expect(parsePlaceholders('no placeholders here')).toEqual([])
  })

  it('空 {{}} は無視される', () => {
    expect(parsePlaceholders('a{{}}b')).toEqual([])
  })

  it('閉じのない {{ は無視される', () => {
    expect(parsePlaceholders('a{{name')).toEqual([])
  })

  it('開きのない }} は無視される', () => {
    expect(parsePlaceholders('name}} rest')).toEqual([])
  })

  it('ネストした記法は内側だけ検出される', () => {
    const result = parsePlaceholders('{{a{{b}}c}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('b')
  })

  it('同じ本文を複数回パースしても同じ結果が返る（正規表現の state に依存しない）', () => {
    const body = '{{x}} {{y}}'
    const first = parsePlaceholders(body)
    const second = parsePlaceholders(body)
    expect(first).toEqual(second)
    expect(first).toHaveLength(2)
  })

  it('スペースを含むプレースホルダはそのまま name に入る', () => {
    const result = parsePlaceholders('{{ padded }}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe(' padded ')
  })
})

describe('findNextPlaceholder', () => {
  it('キャレット以降の最初のプレースホルダを返す', () => {
    const body = '{{a}} {{b}}'
    const next = findNextPlaceholder(body, 6)
    expect(next?.name).toBe('b')
  })

  it('キャレットがプレースホルダ先頭なら自身を返す', () => {
    const body = '{{a}} {{b}}'
    const next = findNextPlaceholder(body, 0)
    expect(next?.name).toBe('a')
  })

  it('プレースホルダの途中 (start < caret < end) は次のプレースホルダを返す', () => {
    const body = '{{a}} {{b}}'
    const next = findNextPlaceholder(body, 2)
    expect(next?.name).toBe('b')
  })

  it('全プレースホルダ通過後は null', () => {
    const body = '{{a}} {{b}}'
    const next = findNextPlaceholder(body, body.length)
    expect(next).toBeNull()
  })

  it('プレースホルダが無い本文は常に null', () => {
    expect(findNextPlaceholder('plain text', 0)).toBeNull()
  })
})
