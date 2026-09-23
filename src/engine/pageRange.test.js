import { describe, expect, it } from 'vitest'
import { normalizeRangeInput, parsePageRange } from './pageRange.js'

describe('parsePageRange 正常输入', () => {
  it('空输入表示全部页', () => {
    expect(parsePageRange('', 3)).toEqual({ ok: true, pages: [1, 2, 3] })
    expect(parsePageRange('   ', 3)).toEqual({ ok: true, pages: [1, 2, 3] })
    expect(parsePageRange(undefined, 2)).toEqual({ ok: true, pages: [1, 2] })
    expect(parsePageRange(null, 2)).toEqual({ ok: true, pages: [1, 2] })
  })

  it('验收清单要求的 1-3,5 → 4 张', () => {
    const result = parsePageRange('1-3,5', 10)
    expect(result.ok).toBe(true)
    expect(result.pages).toEqual([1, 2, 3, 5])
    expect(result.pages).toHaveLength(4)
  })

  it('解析复合范围', () => {
    expect(parsePageRange('1-3,5,8-10', 10).pages).toEqual([1, 2, 3, 5, 8, 9, 10])
  })

  it('单页与整段都支持', () => {
    expect(parsePageRange('7', 10).pages).toEqual([7])
    expect(parsePageRange('1-10', 10).pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('去重并排序', () => {
    expect(parsePageRange('5,1-3,2,5', 10).pages).toEqual([1, 2, 3, 5])
  })

  it('容忍空格', () => {
    expect(parsePageRange(' 1 - 3 , 5 ', 10).pages).toEqual([1, 2, 3, 5])
  })

  it('起止相同的范围等于单页', () => {
    expect(parsePageRange('4-4', 10).pages).toEqual([4])
  })

  it('边界页可用', () => {
    expect(parsePageRange('1', 1).pages).toEqual([1])
    expect(parsePageRange('10', 10).pages).toEqual([10])
  })
})

describe('parsePageRange 非法输入（必须友好失败，不抛异常）', () => {
  it('页码 0 被拒绝', () => {
    const r = parsePageRange('0', 10)
    expect(r.ok).toBe(false)
    expect(r.code).toBe('ZERO')
  })

  it('倒序范围 5-3 被拒绝', () => {
    const r = parsePageRange('5-3', 10)
    expect(r.ok).toBe(false)
    expect(r.code).toBe('REVERSED')
    expect(r.detail).toMatchObject({ start: 5, end: 3 })
  })

  it('超出总页数被拒绝，并带上实际总页数', () => {
    const r = parsePageRange('8-20', 10)
    expect(r.ok).toBe(false)
    expect(r.code).toBe('OUT_OF_RANGE')
    expect(r.detail).toMatchObject({ totalPages: 10, requested: 20 })
  })

  it.each(['abc', '1-', '-3', '1--3', '1,,2', '1;2', '3.5', '-', '1-2-3'])(
    '语法错误：%s',
    (input) => {
      const r = parsePageRange(input, 10)
      expect(r.ok).toBe(false)
      expect(['SYNTAX', 'ZERO']).toContain(r.code)
    }
  )

  it('总页数本身非法时也不崩', () => {
    expect(parsePageRange('1', 0).ok).toBe(false)
    expect(parsePageRange('1', -5).ok).toBe(false)
    expect(parsePageRange('1', 1.5).ok).toBe(false)
    expect(parsePageRange('1', NaN).ok).toBe(false)
  })

  it('任何输入都不抛异常', () => {
    const weird = ['', '   ', '!!!', '99999999999999', '1-99999999999', '，，', String(Infinity)]
    for (const input of weird) {
      expect(() => parsePageRange(input, 10)).not.toThrow()
    }
  })
})

describe('normalizeRangeInput 全角归一化', () => {
  it('全角逗号与破折号', () => {
    expect(normalizeRangeInput('1－3，5')).toBe('1-3,5')
    expect(normalizeRangeInput('1、2')).toBe('1,2')
  })

  it('全角数字', () => {
    expect(normalizeRangeInput('１-３')).toBe('1-3')
  })

  it('中文输入法打出的范围可以直接用', () => {
    expect(parsePageRange('１－３，５', 10).pages).toEqual([1, 2, 3, 5])
  })
})
