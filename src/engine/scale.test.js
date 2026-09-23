import { describe, expect, it } from 'vitest'
import { computeRenderScale, IOS_MAX_CANVAS_PIXELS } from './scale.js'

// A4 = 595 × 842 pt，A0 = 2384 × 3370 pt
const A4 = { widthPt: 595, heightPt: 842 }
const A0 = { widthPt: 2384, heightPt: 3370 }
const LANDSCAPE = { widthPt: 842, heightPt: 595 }

describe('未超限时按 DPI 直接换算', () => {
  it.each([
    [72, 1],
    [150, 150 / 72],
    [300, 300 / 72],
  ])('%i DPI → scale %f', (dpi, expected) => {
    const r = computeRenderScale({ ...A4, dpi })
    expect(r.scale).toBeCloseTo(expected, 10)
    expect(r.clamped).toBe(false)
  })

  it('A4 @300 DPI 不触发降采样', () => {
    const r = computeRenderScale({ ...A4, dpi: 300 })
    expect(r.clamped).toBe(false)
    expect(r.pixels).toBeLessThan(IOS_MAX_CANVAS_PIXELS)
    expect(r.width).toBe(Math.floor(595 * (300 / 72)))
  })

  it('横向页面同样处理', () => {
    const r = computeRenderScale({ ...LANDSCAPE, dpi: 150 })
    expect(r.clamped).toBe(false)
    expect(r.width).toBeGreaterThan(r.height)
  })
})

describe('超过画布上限时自动降采样', () => {
  it('验收清单：A0 @300 DPI 必须被限制', () => {
    const r = computeRenderScale({ ...A0, dpi: 300 })
    expect(r.clamped).toBe(true)
    expect(r.pixels).toBeLessThanOrEqual(IOS_MAX_CANVAS_PIXELS)
    expect(r.scale).toBeLessThan(r.requestedScale)
  })

  it('降采样后仍然是一张有内容的图，不是 0 尺寸', () => {
    const r = computeRenderScale({ ...A0, dpi: 300 })
    expect(r.width).toBeGreaterThan(100)
    expect(r.height).toBeGreaterThan(100)
  })

  it('降采样后长宽比基本不变', () => {
    const r = computeRenderScale({ ...A0, dpi: 300 })
    const original = A0.widthPt / A0.heightPt
    expect(r.width / r.height).toBeCloseTo(original, 2)
  })

  it('requestedScale 保留原始请求，便于提示用户降了多少', () => {
    const r = computeRenderScale({ ...A0, dpi: 300 })
    expect(r.requestedScale).toBeCloseTo(300 / 72, 10)
  })

  it('极端尺寸也不会越界', () => {
    const huge = computeRenderScale({ widthPt: 20000, heightPt: 20000, dpi: 300 })
    expect(huge.pixels).toBeLessThanOrEqual(IOS_MAX_CANVAS_PIXELS)
    expect(huge.clamped).toBe(true)
  })

  it('自定义上限同样生效', () => {
    const r = computeRenderScale({ ...A4, dpi: 300, maxPixels: 1_000_000 })
    expect(r.clamped).toBe(true)
    expect(r.pixels).toBeLessThanOrEqual(1_000_000)
  })

  it('恰好卡在上限附近不会越界', () => {
    for (const maxPixels of [10_000, 123_457, 1_000_003, IOS_MAX_CANVAS_PIXELS]) {
      const r = computeRenderScale({ ...A0, dpi: 600, maxPixels })
      expect(r.pixels).toBeLessThanOrEqual(maxPixels)
    }
  })
})

describe('非法输入抛 RangeError（属程序错误，不是用户输入）', () => {
  it.each([
    ['宽为 0', { widthPt: 0, heightPt: 842, dpi: 150 }],
    ['高为负', { widthPt: 595, heightPt: -1, dpi: 150 }],
    ['DPI 为 0', { ...A4, dpi: 0 }],
    ['DPI 为负', { ...A4, dpi: -300 }],
    ['上限为 0', { ...A4, dpi: 150, maxPixels: 0 }],
    ['宽为 NaN', { widthPt: NaN, heightPt: 842, dpi: 150 }],
  ])('%s', (_label, args) => {
    expect(() => computeRenderScale(args)).toThrow(RangeError)
  })
})
