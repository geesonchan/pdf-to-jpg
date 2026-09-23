/**
 * 引擎错误。
 *
 * 引擎只产出**错误码**，不产出人类可读的文案 —— 文案属于界面层（双语字典）。
 * 这样引擎可以在没有 DOM 的环境里测试，也不会把中英文写死在逻辑里。
 */

export const ENGINE_ERROR_CODES = Object.freeze({
  /** 特性探测未通过（第一道防线） */
  UNSUPPORTED_BROWSER: 'UNSUPPORTED_BROWSER',
  /** pdf.js 代码本身加载失败（第二道防线） */
  PDFJS_LOAD_FAILED: 'PDFJS_LOAD_FAILED',
  /** worker 启动失败（第二道防线） */
  WORKER_INIT_FAILED: 'WORKER_INIT_FAILED',
  /** 文件不是 PDF，或已损坏 */
  INVALID_PDF: 'INVALID_PDF',
  /** 加密 PDF，需要密码 */
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  /** 密码错误 */
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',
  /** 打开 PDF 时的其它失败 */
  PDF_OPEN_FAILED: 'PDF_OPEN_FAILED',
  /** 页码范围非法，detail 里带 pageRange 模块的子码 */
  PAGE_RANGE_INVALID: 'PAGE_RANGE_INVALID',
  /** 渲染失败 */
  RENDER_FAILED: 'RENDER_FAILED',
  /** 画布编码为 JPG 失败 */
  CANVAS_ENCODE_FAILED: 'CANVAS_ENCODE_FAILED',
  /** 用户主动取消 */
  CANCELLED: 'CANCELLED',
})

export class EngineError extends Error {
  /**
   * @param {string} code ENGINE_ERROR_CODES 之一
   * @param {{detail?: object, cause?: unknown}} [options]
   */
  constructor(code, { detail = {}, cause } = {}) {
    super(code, cause === undefined ? undefined : { cause })
    this.name = 'EngineError'
    this.code = code
    this.detail = detail
  }
}

/** 这些错误码意味着「换个文件也没用」，界面应该引导用户升级浏览器。 */
export const BROWSER_LEVEL_CODES = Object.freeze([
  ENGINE_ERROR_CODES.UNSUPPORTED_BROWSER,
  ENGINE_ERROR_CODES.PDFJS_LOAD_FAILED,
  ENGINE_ERROR_CODES.WORKER_INIT_FAILED,
])

/** @param {unknown} err */
export function isBrowserLevelFailure(err) {
  return err instanceof EngineError && BROWSER_LEVEL_CODES.includes(err.code)
}
