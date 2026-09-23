/**
 * 渲染缩放比例计算。纯函数。
 *
 * 两个约束同时作用：
 *   1. 用户选的 DPI（PDF 的用户单位是 1/72 英寸，所以 scale = dpi / 72）
 *   2. 画布像素上限 —— iOS Safari 单个画布超过约 1677 万像素会**静默失败**，
 *      输出全白图且不报错。超限时必须自动降采样并告知用户。
 */

/** iOS Safari 的画布面积上限，约等于 4096 × 4096。 */
export const IOS_MAX_CANVAS_PIXELS = 16_777_216

/** 降采样的下限，避免极端页面被压成不可读的小图。 */
const MIN_SCALE = 0.05

function dimensionsFor(widthPt, heightPt, scale) {
  const width = Math.max(1, Math.floor(widthPt * scale))
  const height = Math.max(1, Math.floor(heightPt * scale))
  return { width, height, pixels: width * height }
}

/**
 * @param {object} args
 * @param {number} args.widthPt  页面宽（PDF 点）
 * @param {number} args.heightPt 页面高（PDF 点）
 * @param {number} args.dpi      目标分辨率
 * @param {number} [args.maxPixels] 画布像素上限
 * @returns {{scale:number, requestedScale:number, clamped:boolean,
 *            width:number, height:number, pixels:number}}
 */
export function computeRenderScale({ widthPt, heightPt, dpi, maxPixels = IOS_MAX_CANVAS_PIXELS }) {
  if (!(widthPt > 0) || !(heightPt > 0)) {
    throw new RangeError(`页面尺寸无效: ${widthPt} x ${heightPt}`)
  }
  if (!(dpi > 0)) {
    throw new RangeError(`DPI 无效: ${dpi}`)
  }
  if (!(maxPixels > 0)) {
    throw new RangeError(`像素上限无效: ${maxPixels}`)
  }

  const requestedScale = dpi / 72
  let scale = requestedScale
  let dims = dimensionsFor(widthPt, heightPt, scale)

  if (dims.pixels <= maxPixels) {
    return { scale, requestedScale, clamped: false, ...dims }
  }

  // 先按面积比一步到位，再小步收敛 —— 因为宽高各自向下取整，
  // 解析解算出的 scale 偶尔仍会差一两个像素越界。
  scale = Math.sqrt(maxPixels / (widthPt * heightPt))
  dims = dimensionsFor(widthPt, heightPt, scale)
  while (dims.pixels > maxPixels && scale > MIN_SCALE) {
    scale *= 0.999
    dims = dimensionsFor(widthPt, heightPt, scale)
  }

  return { scale, requestedScale, clamped: true, ...dims }
}
