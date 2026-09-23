/**
 * 页码范围解析。纯函数，不依赖 DOM 与 pdf.js。
 *
 * 返回 Result 而不是抛异常：非法输入是**用户行为**，不是程序错误，
 * 调用方需要把 code 映射成双语提示（验收要求：非法范围要友好提示，不能崩）。
 */

/** 把中文输入法常见的全角字符归一化成半角，避免「看起来没错却报错」。 */
export function normalizeRangeInput(input) {
  return String(input ?? '')
    .replace(/[，、]/g, ',')
    .replace(/[－–—ー]/g, '-')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} input 例如 "1-3,5,8-10"；空字符串表示全部页
 * @param {number} totalPages PDF 总页数
 * @returns {{ok: true, pages: number[]} | {ok: false, code: string, detail: object}}
 */
export function parsePageRange(input, totalPages) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    return { ok: false, code: 'INVALID_TOTAL', detail: { totalPages } }
  }

  const text = normalizeRangeInput(input)
  if (text === '') {
    return { ok: true, pages: Array.from({ length: totalPages }, (_, i) => i + 1) }
  }

  const pages = new Set()
  for (const part of text.split(',')) {
    const token = part.trim()
    if (token === '') {
      return { ok: false, code: 'SYNTAX', detail: { token: part } }
    }

    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) {
      return { ok: false, code: 'SYNTAX', detail: { token } }
    }

    const start = Number(m[1])
    const end = m[2] === undefined ? start : Number(m[2])

    if (start === 0 || end === 0) {
      return { ok: false, code: 'ZERO', detail: { token } }
    }
    if (end < start) {
      return { ok: false, code: 'REVERSED', detail: { token, start, end } }
    }
    if (start > totalPages || end > totalPages) {
      return {
        ok: false,
        code: 'OUT_OF_RANGE',
        detail: { token, totalPages, requested: Math.max(start, end) },
      }
    }

    for (let p = start; p <= end; p++) pages.add(p)
  }

  return { ok: true, pages: [...pages].sort((a, b) => a - b) }
}
