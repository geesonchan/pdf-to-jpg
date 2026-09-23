import { describe, expect, it } from 'vitest'
import {
  makePageFilename,
  makeZipFilename,
  padWidth,
  sanitizeBaseName,
  stripPdfExtension,
} from './filename.js'

describe('stripPdfExtension', () => {
  it('去掉 .pdf，大小写不敏感', () => {
    expect(stripPdfExtension('report.pdf')).toBe('report')
    expect(stripPdfExtension('report.PDF')).toBe('report')
    expect(stripPdfExtension('report.Pdf')).toBe('report')
  })

  it('只去掉结尾的那个', () => {
    expect(stripPdfExtension('my.pdf.backup.pdf')).toBe('my.pdf.backup')
    expect(stripPdfExtension('a.pdf.txt')).toBe('a.pdf.txt')
  })

  it('没有扩展名时原样返回', () => {
    expect(stripPdfExtension('report')).toBe('report')
  })
})

describe('padWidth 由总页数决定补零位数', () => {
  it.each([
    [1, 1],
    [9, 1],
    [10, 2],
    [50, 2],
    [99, 2],
    [100, 3],
    [1000, 4],
  ])('总页数 %i → %i 位', (total, width) => {
    expect(padWidth(total)).toBe(width)
  })

  it('非法总页数兜底为 1 位', () => {
    expect(padWidth(0)).toBe(1)
    expect(padWidth(-3)).toBe(1)
    expect(padWidth(NaN)).toBe(1)
    expect(padWidth(undefined)).toBe(1)
  })
})

describe('makePageFilename', () => {
  it('验收清单：50 页 PDF 命名为 xxx_p01 … xxx_p50', () => {
    expect(makePageFilename('xxx.pdf', 1, 50)).toBe('xxx_p01.jpg')
    expect(makePageFilename('xxx.pdf', 9, 50)).toBe('xxx_p09.jpg')
    expect(makePageFilename('xxx.pdf', 50, 50)).toBe('xxx_p50.jpg')
  })

  it('三位数总页数补三位', () => {
    expect(makePageFilename('report.pdf', 7, 120)).toBe('report_p007.jpg')
  })

  it('单页 PDF 不补零', () => {
    expect(makePageFilename('invoice.pdf', 1, 1)).toBe('invoice_p1.jpg')
  })

  it('中文文件名保持原样', () => {
    expect(makePageFilename('产品规格书.pdf', 3, 12)).toBe('产品规格书_p03.jpg')
  })

  it('带空格的文件名保留空格', () => {
    expect(makePageFilename('Q4 Report Final.pdf', 2, 10)).toBe('Q4 Report Final_p02.jpg')
  })
})

describe('sanitizeBaseName 防止坏名字进 ZIP 或文件系统', () => {
  it('路径分隔符被替换', () => {
    expect(sanitizeBaseName('a/b\\c.pdf')).toBe('a_b_c')
  })

  it.each(['a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b'])('非法字符 %s 被替换', (name) => {
    expect(sanitizeBaseName(`${name}.pdf`)).toBe('a_b')
  })

  it('目录穿越样式的名字不会留下前导点', () => {
    expect(sanitizeBaseName('../../etc/passwd.pdf')).not.toMatch(/^\./)
    expect(sanitizeBaseName('../../etc/passwd.pdf')).not.toContain('/')
  })

  it('空名字兜底', () => {
    expect(sanitizeBaseName('')).toBe('document')
    expect(sanitizeBaseName('.pdf')).toBe('document')
    expect(sanitizeBaseName('   ')).toBe('document')
    expect(sanitizeBaseName(null)).toBe('document')
  })

  it('超长名字被截断', () => {
    const long = `${'a'.repeat(300)}.pdf`
    expect(sanitizeBaseName(long).length).toBeLessThanOrEqual(100)
  })

  it('截断后仍能生成合法文件名', () => {
    const name = makePageFilename(`${'字'.repeat(300)}.pdf`, 1, 9)
    expect(name.endsWith('_p1.jpg')).toBe(true)
  })
})

describe('makeZipFilename', () => {
  it('用原名加后缀', () => {
    expect(makeZipFilename('report.pdf')).toBe('report_jpg.zip')
    expect(makeZipFilename('产品规格书.pdf')).toBe('产品规格书_jpg.zip')
  })
})
