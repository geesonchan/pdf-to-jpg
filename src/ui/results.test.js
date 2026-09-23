import { describe, expect, it } from 'vitest'
import { planThumbnails, summarizeClamped } from './results.js'

describe('planThumbnails 不变式：shown + hidden 永远等于 total', () => {
  it.each([0, 1, 5, 11, 12, 13, 50, 200, 999])('total = %i 时账对得上', (total) => {
    const plan = planThumbnails(total, 12)
    expect(plan.shown + plan.hidden).toBe(total)
  })

  it('不足上限时全部显示，不提示还有更多', () => {
    expect(planThumbnails(5, 12)).toEqual({ shown: 5, hidden: 0, hasMore: false })
    expect(planThumbnails(12, 12)).toEqual({ shown: 12, hidden: 0, hasMore: false })
  })

  it('13 页这个边界：显示 12 张，明确还有 1 张没显示', () => {
    // 这正是 Leo 报的那个情况 —— 转换没丢页，是界面没说清楚
    expect(planThumbnails(13, 12)).toEqual({ shown: 12, hidden: 1, hasMore: true })
  })

  it('大量页面时 hidden 数正确', () => {
    expect(planThumbnails(50, 12)).toEqual({ shown: 12, hidden: 38, hasMore: true })
  })

  it('total 为 0 或非法时不崩', () => {
    expect(planThumbnails(0, 12)).toEqual({ shown: 0, hidden: 0, hasMore: false })
    expect(planThumbnails(-3, 12)).toEqual({ shown: 0, hidden: 0, hasMore: false })
    expect(planThumbnails(NaN, 12)).toEqual({ shown: 0, hidden: 0, hasMore: false })
    expect(planThumbnails(undefined, 12)).toEqual({ shown: 0, hidden: 0, hasMore: false })
  })

  it('上限非法时视为不限，全部显示', () => {
    expect(planThumbnails(13, 0)).toEqual({ shown: 13, hidden: 0, hasMore: false })
    expect(planThumbnails(13, NaN)).toEqual({ shown: 13, hidden: 0, hasMore: false })
  })
})

describe('summarizeClamped', () => {
  const page = (width, height, clamped = false) => ({ width, height, clamped })

  it('没有降采样时 count 为 0', () => {
    expect(summarizeClamped([page(1239, 1754), page(1239, 1754)])).toEqual({
      count: 0,
      width: 0,
      height: 0,
      mixed: false,
    })
    expect(summarizeClamped([]).count).toBe(0)
    expect(summarizeClamped().count).toBe(0)
  })

  it('只统计被降采样的页', () => {
    const summary = summarizeClamped([
      page(1239, 1754),
      page(3445, 4869, true),
      page(1239, 1754),
    ])
    expect(summary.count).toBe(1)
    expect(summary.width).toBe(3445)
    expect(summary.height).toBe(4869)
    expect(summary.mixed).toBe(false)
  })

  it('尺寸一致时 mixed 为 false，提示可以直接说出尺寸', () => {
    const summary = summarizeClamped([page(3445, 4869, true), page(3445, 4869, true)])
    expect(summary).toEqual({ count: 2, width: 3445, height: 4869, mixed: false })
  })

  it('尺寸不一致时 mixed 为 true，报告其中最大的一张', () => {
    const summary = summarizeClamped([
      page(3445, 4869, true),
      page(2000, 3000, true),
      page(3443, 4871, true),
    ])
    expect(summary.count).toBe(3)
    expect(summary.mixed).toBe(true)
    expect(summary.width * summary.height).toBe(3445 * 4869)
  })

  it('全部页面都被降采样时 count 等于总页数', () => {
    const pages = Array.from({ length: 13 }, () => page(3445, 4869, true))
    expect(summarizeClamped(pages).count).toBe(13)
  })
})
