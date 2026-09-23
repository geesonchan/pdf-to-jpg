/**
 * 结果区的纯逻辑。抽出来是为了能测 —— 尤其是「显示的张数」和「实际产出的张数」
 * 必须永远对得上账：缩略图有上限，但界面必须把没显示的部分说清楚，
 * 否则 13 页只看到 12 张缩略图，用户会以为丢了一页。
 */

/**
 * 缩略图显示计划。
 * @param {number} total 实际产出的张数
 * @param {number} max 最多显示几张
 * @returns {{shown:number, hidden:number, hasMore:boolean}}
 *   不变式：shown + hidden === total
 */
export function planThumbnails(total, max) {
  const count = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : count

  const shown = Math.min(count, limit)
  return { shown, hidden: count - shown, hasMore: count > shown }
}

/**
 * 汇总被降采样的页面，供提示文案使用。
 * 报告的是这些页里**最大**的输出尺寸 —— 用户最关心「最好的那张有多大」。
 *
 * @param {{clamped?:boolean, width:number, height:number}[]} pages
 * @returns {{count:number, width:number, height:number, mixed:boolean}}
 *   count 为 0 时不应显示提示
 */
export function summarizeClamped(pages = []) {
  const clamped = pages.filter((p) => p?.clamped)
  if (clamped.length === 0) {
    return { count: 0, width: 0, height: 0, mixed: false }
  }

  let largest = clamped[0]
  for (const page of clamped) {
    if (page.width * page.height > largest.width * largest.height) largest = page
  }

  const distinct = new Set(clamped.map((p) => `${p.width}x${p.height}`))
  return {
    count: clamped.length,
    width: largest.width,
    height: largest.height,
    mixed: distinct.size > 1,
  }
}
