import { describe, expect, it } from 'vitest'
import {
  DPI_CHOICES,
  formatBytes,
  normalizeDpi,
  normalizeQuality,
  progressPercent,
} from './format.js'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [1024 * 1024 * 1024, '1.0 GB'],
  ])('%i → %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  it('大于 10 的值取整，不留没信息量的小数', () => {
    expect(formatBytes(1024 * 50)).toBe('50 KB')
    expect(formatBytes(1024 * 1024 * 42)).toBe('42 MB')
  })

  it('非法输入返回破折号而不是 NaN', () => {
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(NaN)).toBe('—')
    expect(formatBytes(undefined)).toBe('—')
    expect(formatBytes('abc')).toBe('—')
  })

  it('超大值停在 GB 不会溢出单位表', () => {
    expect(formatBytes(1024 ** 5)).toMatch(/GB$/)
  })
})

describe('progressPercent', () => {
  it.each([
    [0, 10, 0],
    [5, 10, 50],
    [10, 10, 100],
  ])('%i/%i → %i%%', (done, total, expected) => {
    expect(progressPercent(done, total)).toBe(expected)
  })

  it('总数为 0 时返回 0 而不是 NaN', () => {
    expect(progressPercent(3, 0)).toBe(0)
    expect(progressPercent(0, 0)).toBe(0)
  })

  it('越界值被夹住', () => {
    expect(progressPercent(15, 10)).toBe(100)
    expect(progressPercent(-3, 10)).toBe(0)
  })
})

describe('normalizeQuality', () => {
  it('范围内的值原样通过', () => {
    expect(normalizeQuality(0.85)).toBe(0.85)
    expect(normalizeQuality(0.5)).toBe(0.5)
    expect(normalizeQuality(0.95)).toBe(0.95)
  })

  it('超出范围被夹到边界', () => {
    expect(normalizeQuality(0.1)).toBe(0.5)
    expect(normalizeQuality(1)).toBe(0.95)
    expect(normalizeQuality(-5)).toBe(0.5)
  })

  it('消除浮点尾巴 —— 否则会把 0.8500000000000001 传给 toBlob', () => {
    expect(normalizeQuality(0.1 + 0.75)).toBe(0.85)
    expect(String(normalizeQuality(0.7000000000000001))).toBe('0.7')
  })

  it('非法输入回到默认值', () => {
    expect(normalizeQuality('abc')).toBe(0.85)
    expect(normalizeQuality(NaN)).toBe(0.85)
    expect(normalizeQuality(undefined)).toBe(0.85)
  })

  it('字符串数字可以接受（来自 input.value）', () => {
    expect(normalizeQuality('0.75')).toBe(0.75)
  })
})

describe('normalizeDpi', () => {
  it.each(DPI_CHOICES)('接受界面提供的 %i', (dpi) => {
    expect(normalizeDpi(dpi)).toBe(dpi)
    expect(normalizeDpi(String(dpi))).toBe(dpi)
  })

  it('其它值一律回到 150', () => {
    expect(normalizeDpi(96)).toBe(150)
    expect(normalizeDpi(9999)).toBe(150)
    expect(normalizeDpi('abc')).toBe(150)
    expect(normalizeDpi(undefined)).toBe(150)
    expect(normalizeDpi(null)).toBe(150)
  })
})
