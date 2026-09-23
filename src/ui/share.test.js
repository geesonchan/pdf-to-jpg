import { describe, expect, it, vi } from 'vitest'
import {
  SHARE_FILE_LIMIT,
  buildShareFiles,
  canShareFiles,
  isShareCancellation,
  shareFiles,
  withinShareLimit,
} from './share.js'

const fakeResult = (name) => ({ name, blob: new Blob(['x'], { type: 'image/jpeg' }) })
const fakeFiles = (n) => Array.from({ length: n }, (_, i) => new File(['x'], `p${i}.jpg`))

describe('buildShareFiles', () => {
  it('把结果变成带正确文件名和类型的 File', () => {
    const files = buildShareFiles([fakeResult('doc_p01.jpg'), fakeResult('doc_p02.jpg')])
    expect(files).toHaveLength(2)
    expect(files[0].name).toBe('doc_p01.jpg')
    expect(files[0].type).toBe('image/jpeg')
  })

  it('blob 没有类型时兜底为 image/jpeg', () => {
    const files = buildShareFiles([{ name: 'a.jpg', blob: new Blob(['x']) }])
    expect(files[0].type).toBe('image/jpeg')
  })

  it('空结果返回空数组', () => {
    expect(buildShareFiles([])).toEqual([])
  })
})

describe('canShareFiles', () => {
  it('设备支持且文件可分享时为 true', () => {
    const nav = { share: () => {}, canShare: () => true }
    expect(canShareFiles(fakeFiles(3), nav)).toBe(true)
  })

  it('没有 share 或 canShare 时为 false', () => {
    expect(canShareFiles(fakeFiles(1), { canShare: () => true })).toBe(false)
    expect(canShareFiles(fakeFiles(1), { share: () => {} })).toBe(false)
    expect(canShareFiles(fakeFiles(1), {})).toBe(false)
  })

  it('canShare 返回 false 时为 false —— 桌面浏览器常常有 share 但不收文件', () => {
    const nav = { share: () => {}, canShare: () => false }
    expect(canShareFiles(fakeFiles(3), nav)).toBe(false)
  })

  it('canShare 抛异常时视为不支持，不向上冒泡', () => {
    const nav = {
      share: () => {},
      canShare: () => {
        throw new TypeError('不认识 files 字段')
      },
    }
    expect(() => canShareFiles(fakeFiles(1), nav)).not.toThrow()
    expect(canShareFiles(fakeFiles(1), nav)).toBe(false)
  })

  it('没有文件时为 false', () => {
    const nav = { share: () => {}, canShare: () => true }
    expect(canShareFiles([], nav)).toBe(false)
    expect(canShareFiles(undefined, nav)).toBe(false)
  })

  it('把文件真的传给了 canShare', () => {
    const canShare = vi.fn(() => true)
    const files = fakeFiles(2)
    canShareFiles(files, { share: () => {}, canShare })
    expect(canShare).toHaveBeenCalledWith({ files })
  })
})

describe('withinShareLimit', () => {
  it('上限之内为 true', () => {
    expect(withinShareLimit(1)).toBe(true)
    expect(withinShareLimit(SHARE_FILE_LIMIT)).toBe(true)
  })

  it('超过上限为 false', () => {
    expect(withinShareLimit(SHARE_FILE_LIMIT + 1)).toBe(false)
    expect(withinShareLimit(50)).toBe(false)
  })

  it('0 张没什么可分享的', () => {
    expect(withinShareLimit(0)).toBe(false)
  })

  it('上限可覆盖 —— 真机验证后改这个值即可', () => {
    expect(withinShareLimit(5, 3)).toBe(false)
    expect(withinShareLimit(3, 3)).toBe(true)
  })

  it('暂定上限是 20（待真机验证，见 D29）', () => {
    expect(SHARE_FILE_LIMIT).toBe(20)
  })
})

describe('isShareCancellation', () => {
  it('AbortError 是用户取消，不是错误', () => {
    const err = new Error('user cancelled')
    err.name = 'AbortError'
    expect(isShareCancellation(err)).toBe(true)
  })

  it('其它异常不是取消', () => {
    expect(isShareCancellation(new TypeError('boom'))).toBe(false)
    expect(isShareCancellation(undefined)).toBe(false)
  })
})

describe('shareFiles 的三种结局', () => {
  it('成功时返回 shared', async () => {
    const nav = { share: vi.fn(() => Promise.resolve()) }
    await expect(shareFiles(fakeFiles(2), { title: 'a.pdf', nav })).resolves.toBe('shared')
    expect(nav.share).toHaveBeenCalledOnce()
  })

  it('用户取消时返回 cancelled，且不抛异常', async () => {
    const abort = new Error('cancelled')
    abort.name = 'AbortError'
    const nav = { share: () => Promise.reject(abort) }
    await expect(shareFiles(fakeFiles(1), { nav })).resolves.toBe('cancelled')
  })

  it('真的失败时返回 failed', async () => {
    const nav = { share: () => Promise.reject(new TypeError('not allowed')) }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(shareFiles(fakeFiles(1), { nav })).resolves.toBe('failed')
    spy.mockRestore()
  })

  it('把文件和标题一起交给系统', async () => {
    const share = vi.fn(() => Promise.resolve())
    const files = fakeFiles(3)
    await shareFiles(files, { title: '规格书.pdf', nav: { share } })
    expect(share).toHaveBeenCalledWith({ files, title: '规格书.pdf' })
  })
})
