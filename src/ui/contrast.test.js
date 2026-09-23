import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AA_NON_TEXT,
  AA_TEXT,
  contrastRatio,
  meetsContrast,
  parseHex,
  relativeLuminance,
} from './contrast.js'

const CSS = readFileSync(fileURLToPath(new URL('../style.css', import.meta.url)), 'utf8')

/**
 * 从 style.css 里读出颜色令牌。
 * 浅色取 :root 块，深色取 prefers-color-scheme: dark 块里的覆盖值。
 */
function readTokens() {
  const rootBlock = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('}', CSS.indexOf(':root {')))
  const darkStart = CSS.indexOf('@media (prefers-color-scheme: dark)')
  const darkBlock = CSS.slice(darkStart, CSS.indexOf('\n}', darkStart))

  const pick = (block) => {
    const tokens = {}
    for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
      tokens[name] = value
    }
    return tokens
  }

  const light = pick(rootBlock)
  return { light, dark: { ...light, ...pick(darkBlock) } }
}

const THEMES = readTokens()

describe('对比度计算本身', () => {
  it('解析十六进制颜色', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255])
    expect(parseHex('000000')).toEqual([0, 0, 0])
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('非法颜色抛错而不是静默给出错误结果', () => {
    expect(() => parseHex('#xyz')).toThrow(RangeError)
    expect(() => parseHex('')).toThrow(RangeError)
    expect(() => parseHex('#12345')).toThrow(RangeError)
  })

  it('黑白对比度是 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('同色对比度是 1:1', () => {
    expect(contrastRatio('#7f7f7f', '#7f7f7f')).toBeCloseTo(1, 5)
  })

  it('顺序无关', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(
      contrastRatio('#fedcba', '#123456'),
      10
    )
  })

  it('相对亮度端点正确', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })
})

describe('颜色令牌解析到了', () => {
  it.each(['light', 'dark'])('%s 主题读到了需要的令牌', (theme) => {
    for (const token of ['bg', 'surface', 'fg', 'muted', 'border-strong', 'accent', 'accent-fg']) {
      expect(THEMES[theme][token], `${theme} 缺少 --${token}`).toBeTruthy()
    }
  })
})

describe('正文文字达到 WCAG AA（≥ 4.5:1）', () => {
  it.each(['light', 'dark'])('%s：--fg 对 --bg 与 --surface', (theme) => {
    const c = THEMES[theme]
    expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(c.fg, c.surface)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(['light', 'dark'])('%s：次要文字 --muted 也要达标', (theme) => {
    const c = THEMES[theme]
    expect(contrastRatio(c.muted, c.bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(c.muted, c.surface)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(['light', 'dark'])('%s：主按钮文字对主按钮底色', (theme) => {
    const c = THEMES[theme]
    expect(contrastRatio(c['accent-fg'], c.accent)).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('控件边界达到 WCAG 1.4.11（≥ 3:1）', () => {
  // 这条是 "Convert another" 按钮那次问题的回归守卫：
  // 文字本来就达标，看不出是按钮是因为边框只有 1.26:1。
  it.each(['light', 'dark'])('%s：--border-strong 对 --bg 与 --surface', (theme) => {
    const c = THEMES[theme]
    expect(
      contrastRatio(c['border-strong'], c.bg),
      `${theme} 边框对背景对比度不足`
    ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(
      contrastRatio(c['border-strong'], c.surface),
      `${theme} 边框对卡片底色对比度不足`
    ).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it.each(['light', 'dark'])('%s：--rule 只配做分隔线，不该被拿去做控件边框', (theme) => {
    // 记录现状：--rule 达不到 3:1，所以按钮/输入框必须用 --border-strong。
    // 若哪天有人把 --rule 调亮到达标，这条会红，提醒去掉这个区分。
    expect(contrastRatio(THEMES[theme].rule, THEMES[theme].bg)).toBeLessThan(AA_NON_TEXT)
  })
})

describe('meetsContrast 辅助函数', () => {
  it('按阈值判断', () => {
    expect(meetsContrast('#000000', '#ffffff')).toBe(true)
    expect(meetsContrast('#777777', '#808080')).toBe(false)
    expect(meetsContrast('#767676', '#ffffff', AA_TEXT)).toBe(true)
  })
})
