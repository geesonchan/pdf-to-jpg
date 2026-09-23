/**
 * 转换引擎：ArrayBuffer + 选项 → 逐页产出 { pageNumber, blob }。
 *
 * 设计要点：
 * - 不碰界面。所有失败都表现为带 code 的 EngineError，由界面层翻译成双语文案。
 * - 严格逐页：任何时刻只持有一张画布，产出后立刻释放（画布宽高置 0 + page.cleanup()）。
 * - 可取消：传入 AbortSignal，页间检查 + 中断正在进行的渲染。
 * - 两道防线（DECISIONS.md D21）：
 *     第一道 —— 调用 pdf.js 之前先做特性探测；
 *     第二道 —— pdf.js 的动态 import 与 worker 启动都包在 try/catch 里，
 *               失败时同样归到「浏览器不支持」，绝不白屏。
 */

import { EngineError, ENGINE_ERROR_CODES as CODES } from './errors.js'
import { parsePageRange } from './pageRange.js'
import { computeRenderScale, IOS_MAX_CANVAS_PIXELS } from './scale.js'
import { detectSupport } from './support.js'

export const DEFAULT_OPTIONS = Object.freeze({
  dpi: 150,
  quality: 0.85,
  pageRange: '',
  password: undefined,
  maxPixels: IOS_MAX_CANVAS_PIXELS,
})

let pdfjsPromise = null

/**
 * 懒加载 pdf.js（legacy 构建）。
 * 动态 import 有两个好处：首屏不必背上 ~500 KB；加载失败可以被 catch 住。
 */
async function loadPdfjs() {
  if (pdfjsPromise) return pdfjsPromise

  pdfjsPromise = (async () => {
    const [lib, workerUrlModule] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
    ])
    lib.GlobalWorkerOptions.workerSrc = workerUrlModule.default
    return lib
  })()

  try {
    return await pdfjsPromise
  } catch (cause) {
    pdfjsPromise = null // 允许重试
    throw new EngineError(CODES.PDFJS_LOAD_FAILED, { cause })
  }
}

/**
 * 后台预热 pdf.js。
 *
 * 首次转换要先下载约 500 KB 的 pdf.js 和 2.4 MB 的 worker；等用户选好文件再开始下载，
 * 那段等待全落在用户眼前。页面空闲时先拉下来，点「开始转换」时通常已经就绪。
 *
 * 失败不抛异常 —— 预加载只是优化，真正的错误处理在 convertPdfToJpegs 里。
 */
export function preloadEngine() {
  return loadPdfjs().then(
    () => true,
    () => false
  )
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new EngineError(CODES.CANCELLED)
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new EngineError(CODES.CANVAS_ENCODE_FAILED))
      },
      'image/jpeg',
      quality
    )
  })
}

/** 把 pdf.js 的异常翻译成引擎错误码。 */
function translateOpenError(err) {
  // pdf.js 的 PasswordException 带 code：1 = 需要密码，2 = 密码错误
  if (err?.name === 'PasswordException') {
    return new EngineError(err.code === 2 ? CODES.PASSWORD_INCORRECT : CODES.PASSWORD_REQUIRED, {
      cause: err,
    })
  }
  if (err?.name === 'InvalidPDFException') {
    return new EngineError(CODES.INVALID_PDF, { cause: err })
  }
  // worker 起不来时 pdf.js 抛的是普通 Error，只能靠文本判断
  if (/worker/i.test(err?.message ?? '')) {
    return new EngineError(CODES.WORKER_INIT_FAILED, { cause: err })
  }
  return new EngineError(CODES.PDF_OPEN_FAILED, { cause: err })
}

/**
 * 逐页转换。
 *
 * @param {ArrayBuffer|Uint8Array} source PDF 原始字节
 * @param {Partial<typeof DEFAULT_OPTIONS>} [options]
 * @param {{signal?: AbortSignal}} [ctx]
 * @yields {{pageNumber:number, blob:Blob, width:number, height:number,
 *           clamped:boolean, index:number, total:number, totalPages:number}}
 *   total      = 本次要转换的页数，用于进度显示（第 index / total 页）
 *   totalPages = 文档的总页数，用于决定文件名补零位数 —— 两者不是一回事：
 *                50 页文档里只选 4 页，文件名仍应是 _p01 而不是 _p1
 *   source     = 这一页在 scale=1 时的尺寸（已含 PDF 的 userUnit）与请求的缩放比例，
 *                用来回答「为什么这一页被降采样了」——普通 A4 在 150 DPI 下不该触发，
 *                真触发了就说明页面本身很大，或者 userUnit 不是 1
 */
export async function* convertPdfToJpegs(source, options = {}, { signal } = {}) {
  const { dpi, quality, pageRange, password, maxPixels } = { ...DEFAULT_OPTIONS, ...options }

  // ── 第一道防线：调用 pdf.js 之前先探测 ──
  const support = detectSupport()
  if (!support.supported) {
    throw new EngineError(CODES.UNSUPPORTED_BROWSER, { detail: support })
  }

  throwIfAborted(signal)

  // ── 第二道防线：加载失败也归到浏览器级失败 ──
  const pdfjs = await loadPdfjs()

  // pdf.js 会「吃掉」传入的 buffer，复制一份避免调用方的数据被清空
  const data = source instanceof Uint8Array ? source.slice() : new Uint8Array(source).slice()

  const loadingTask = pdfjs.getDocument({
    data,
    password,
    isEvalSupported: false, // 与阶段 4 的 CSP 不冲突（KICKOFF §4）
    // pdf.js 6 用 WebAssembly 解码 JPEG2000 等图像。不指定路径时它会去
    // 默认的相对位置找，在 base 不是 / 的站点上会 404，表现为某些页面空白。
    // 这些 .wasm 随站点一起打包，仍是同源请求（约束 C1）。
    wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`,
  })

  let doc
  try {
    doc = await loadingTask.promise
  } catch (err) {
    throw translateOpenError(err)
  }

  try {
    const range = parsePageRange(pageRange, doc.numPages)
    if (!range.ok) {
      throw new EngineError(CODES.PAGE_RANGE_INVALID, {
        detail: { reason: range.code, ...range.detail },
      })
    }

    const total = range.pages.length
    const totalPages = doc.numPages
    let index = 0

    for (const pageNumber of range.pages) {
      throwIfAborted(signal)
      index += 1

      const page = await doc.getPage(pageNumber)
      let canvas = null
      let onAbort = null
      let renderTask = null

      try {
        const base = page.getViewport({ scale: 1 })
        const { scale, requestedScale, clamped, width, height } = computeRenderScale({
          widthPt: base.width,
          heightPt: base.height,
          dpi,
          maxPixels,
        })

        const viewport = page.getViewport({ scale })

        canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        // alpha: false + 白底填充 —— JPG 没有透明通道，不填会变成黑块（KICKOFF §4）
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) throw new EngineError(CODES.RENDER_FAILED, { detail: { pageNumber } })
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        renderTask = page.render({ canvasContext: ctx, viewport })
        if (signal) {
          onAbort = () => renderTask.cancel()
          signal.addEventListener('abort', onAbort, { once: true })
        }

        try {
          await renderTask.promise
        } catch (err) {
          if (signal?.aborted) throw new EngineError(CODES.CANCELLED, { cause: err })
          throw new EngineError(CODES.RENDER_FAILED, { detail: { pageNumber }, cause: err })
        }

        throwIfAborted(signal)
        const blob = await canvasToJpegBlob(canvas, quality)
        throwIfAborted(signal)

        yield {
          pageNumber,
          blob,
          width,
          height,
          clamped,
          index,
          total,
          totalPages,
          source: {
            widthPt: base.width,
            heightPt: base.height,
            requestedScale,
            requestedWidth: Math.floor(base.width * requestedScale),
            requestedHeight: Math.floor(base.height * requestedScale),
            maxPixels,
          },
        }
      } finally {
        if (onAbort) signal.removeEventListener('abort', onAbort)
        if (canvas) {
          // 立刻释放显存：置 0 比等 GC 可靠得多
          canvas.width = 0
          canvas.height = 0
          canvas = null
        }
        page.cleanup()
      }
    }
  } finally {
    // 释放文档与 worker：pdf.js 的清理入口在 loadingTask 上，不在文档对象上
    await loadingTask.destroy().catch(() => {})
  }
}
