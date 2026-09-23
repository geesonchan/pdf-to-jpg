import { describe, expect, it } from 'vitest'
import { ISSUES_URL, UNSUPPORTED_TEXT, unsupportedText } from './unsupported.js'
import { MIN_IOS_VERSION } from '../engine/support.js'

const LANGS = ['zh', 'en']
const PLATFORMS = ['ios', 'desktop']
const KEYS = ['title', 'body', 'note', 'feedback']

describe('双语字典完整性（验收：中英切换无漏译）', () => {
  it.each(LANGS)('%s 两个平台的文案都齐全', (lang) => {
    for (const platform of PLATFORMS) {
      for (const key of KEYS) {
        const value = UNSUPPORTED_TEXT[lang][platform][key]
        expect(value, `${lang}.${platform}.${key}`).toBeTruthy()
        expect(typeof value).toBe('string')
        expect(value.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('中英两侧的键完全一致', () => {
    expect(Object.keys(UNSUPPORTED_TEXT.zh).sort()).toEqual(Object.keys(UNSUPPORTED_TEXT.en).sort())
    for (const platform of PLATFORMS) {
      expect(Object.keys(UNSUPPORTED_TEXT.zh[platform]).sort()).toEqual(
        Object.keys(UNSUPPORTED_TEXT.en[platform]).sort()
      )
    }
  })

  it('每种语言都有隐私说明', () => {
    for (const lang of LANGS) {
      expect(UNSUPPORTED_TEXT[lang].privacy).toBeTruthy()
    }
  })

  it('中文文案没有残留英文占位，英文文案没有混入中文', () => {
    for (const platform of PLATFORMS) {
      for (const key of KEYS) {
        expect(UNSUPPORTED_TEXT.zh[platform][key]).toMatch(/[一-龥]/)
        expect(UNSUPPORTED_TEXT.en[platform][key]).not.toMatch(/[一-龥]/)
      }
    }
  })
})

describe('文案内容符合决策 D21', () => {
  it('iOS 文案给出的版本号与 support.js 的 MIN_IOS_VERSION 一致', () => {
    expect(UNSUPPORTED_TEXT.zh.ios.body).toContain(MIN_IOS_VERSION)
    expect(UNSUPPORTED_TEXT.en.ios.body).toContain(MIN_IOS_VERSION)
  })

  it('iOS 文案必须说明换浏览器无效（iOS 上全是 WebKit）', () => {
    expect(UNSUPPORTED_TEXT.zh.ios.note).toMatch(/换用|不会解决/)
    expect(UNSUPPORTED_TEXT.en.ios.note).toMatch(/will not help/i)
  })

  it('iOS 文案不能建议换浏览器', () => {
    expect(UNSUPPORTED_TEXT.zh.ios.body).not.toMatch(/改用 Chrome|改用 Firefox/)
    expect(UNSUPPORTED_TEXT.en.ios.body).not.toMatch(/switch to (Chrome|Firefox)/i)
  })

  it('桌面文案要给出换浏览器这条路', () => {
    expect(UNSUPPORTED_TEXT.zh.desktop.note).toMatch(/Chrome|Firefox/)
    expect(UNSUPPORTED_TEXT.en.desktop.note).toMatch(/Chrome|Firefox/)
  })
})

describe('unsupportedText()', () => {
  it.each(PLATFORMS)('%s 平台返回可直接渲染的对象', (platform) => {
    for (const lang of LANGS) {
      const t = unsupportedText(platform, lang)
      expect(t.title).toBeTruthy()
      expect(t.body).toBeTruthy()
      expect(t.note).toBeTruthy()
      expect(t.privacy).toBeTruthy()
      expect(t.issuesUrl).toBe(ISSUES_URL)
    }
  })

  it('未知语言回退到英文', () => {
    expect(unsupportedText('ios', 'fr').title).toBe(UNSUPPORTED_TEXT.en.ios.title)
  })

  it('未知平台回退到桌面文案', () => {
    expect(unsupportedText('toaster', 'zh').title).toBe(UNSUPPORTED_TEXT.zh.desktop.title)
  })

  it('反馈链接指向本仓库的 Issues，且是同一个常量', () => {
    expect(ISSUES_URL).toBe('https://github.com/geesonchan/pdf-to-jpg/issues')
  })
})
