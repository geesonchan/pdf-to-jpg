import { describe, expect, it } from 'vitest'
import {
  ALL_FEATURES,
  CHECKED_AGAINST_PDFJS,
  MIN_IOS_VERSION,
  PDFJS_FEATURES,
  detectPlatform,
  detectSupport,
} from './support.js'

/** 构造一个「样样齐全」的假 globals。 */
function fullGlobals(overrides = {}) {
  return {
    Promise: { withResolvers: () => {} },
    HTMLCanvasElement: { prototype: { toBlob: () => {} } },
    Worker: function Worker() {},
    AbortController: function AbortController() {},
    ...overrides,
  }
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const WINDOWS_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('detectPlatform', () => {
  it('iPhone / iPad / iPod 判为 ios', () => {
    expect(detectPlatform({ userAgent: IPHONE_UA })).toBe('ios')
    expect(detectPlatform({ userAgent: '... iPad ...' })).toBe('ios')
    expect(detectPlatform({ userAgent: '... iPod ...' })).toBe('ios')
  })

  it('iPadOS 伪装成桌面 Mac，靠触控点数识别', () => {
    expect(detectPlatform({ userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      'ios'
    )
  })

  it('真正的 Mac 不会被误判', () => {
    expect(detectPlatform({ userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(
      'desktop'
    )
  })

  it('Windows Chrome 判为 desktop', () => {
    expect(detectPlatform({ userAgent: WINDOWS_CHROME_UA })).toBe('desktop')
  })

  it('空环境兜底为 desktop，不抛异常', () => {
    expect(detectPlatform()).toBe('desktop')
    expect(detectPlatform({})).toBe('desktop')
  })
})

describe('detectSupport', () => {
  it('样样齐全时判为支持', () => {
    const r = detectSupport({ globals: fullGlobals(), userAgent: WINDOWS_CHROME_UA })
    expect(r.supported).toBe(true)
    expect(r.missing).toEqual([])
  })

  it('缺 Promise.withResolvers 判为不支持（这是 legacy 版的实际下限）', () => {
    const r = detectSupport({
      globals: fullGlobals({ Promise: {} }),
      userAgent: IPHONE_UA,
    })
    expect(r.supported).toBe(false)
    expect(r.missing.map((f) => f.id)).toContain('promise-with-resolvers')
    expect(r.platform).toBe('ios')
  })

  it.each([
    ['canvas-to-blob', { HTMLCanvasElement: { prototype: {} } }],
    ['worker', { Worker: undefined }],
    ['abort-controller', { AbortController: undefined }],
  ])('缺 %s 时判为不支持', (id, override) => {
    const r = detectSupport({ globals: fullGlobals(override) })
    expect(r.supported).toBe(false)
    expect(r.missing.map((f) => f.id)).toContain(id)
  })

  it('空 globals 时列出全部缺失项，而不是崩溃', () => {
    const r = detectSupport({ globals: {} })
    expect(r.supported).toBe(false)
    expect(r.missing).toHaveLength(ALL_FEATURES.length)
  })

  it('探测函数自身抛异常时算作不支持', () => {
    const hostile = {
      get Promise() {
        throw new Error('全局对象被改写了')
      },
    }
    expect(() => detectSupport({ globals: hostile })).not.toThrow()
    expect(detectSupport({ globals: hostile }).supported).toBe(false)
  })

  it('缺失项带 since 数据，供提示文案使用', () => {
    const r = detectSupport({ globals: {} })
    for (const item of r.missing) {
      expect(item.since).toBeTruthy()
      expect(typeof item.api).toBe('string')
    }
  })
})

describe('探测表与 legacy 构建的约定', () => {
  it('不探测 legacy 已经 polyfill 的 API —— 否则会把可用浏览器误判为不支持', () => {
    const apis = ALL_FEATURES.map((f) => f.api)
    expect(apis).not.toContain('Math.sumPrecise')
    expect(apis).not.toContain('Iterator')
  })

  it('记录了核对时所针对的 pdfjs-dist 版本', () => {
    expect(CHECKED_AGAINST_PDFJS).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('MIN_IOS_VERSION 与探测表里最高的 ios 要求一致', () => {
    const highest = PDFJS_FEATURES.map((f) => f.since.ios).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )
    expect(MIN_IOS_VERSION).toBe(highest.at(-1))
  })
})
