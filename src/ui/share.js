/**
 * 系统分享（iOS 上即「存到相册 / 存到文件 / 发给某人」）。
 *
 * 三条硬性规则，违反任何一条 iOS 都会拒绝分享：
 *
 * 1. `navigator.share()` 必须在**用户手势的同一个事件循环里**直接调用。
 *    不能先 await 任何东西再调 —— 所以文件必须在转换结束时就准备好，
 *    点击时只做一次同步调用。
 * 2. 必须先用 `navigator.canShare({ files })` 问过，能力探测不能只看
 *    `navigator.share` 是否存在：桌面 Chrome 有 share 但不一定收文件。
 * 3. 不分享 ZIP。ZIP 存不进相册，分享出去的意义不大；要 ZIP 就走下载。
 *
 * 用户在系统分享面板上点「取消」会抛 AbortError —— 那是正常操作，不是错误。
 */

/**
 * 一次最多分享几张。
 * ⚠️ 暂定值，待真机验证（DECISIONS.md D29）。iOS 的分享面板在文件数量多时
 * 会变慢甚至拒绝，具体门槛没有公开文档，只能实测。
 */
export const SHARE_FILE_LIMIT = 20

/** 把转换结果变成 File 对象。转换结束时就调用，点击时不能再做这件事。 */
export function buildShareFiles(results) {
  return results.map(
    (result) => new File([result.blob], result.name, { type: result.blob.type || 'image/jpeg' })
  )
}

/**
 * 这台设备能不能分享这些文件。
 * @param {File[]} files
 * @param {Navigator} [nav]
 */
export function canShareFiles(files, nav = globalThis.navigator) {
  if (!files || files.length === 0) return false
  if (typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function') return false

  try {
    return nav.canShare({ files })
  } catch {
    // 某些实现对不支持的字段直接抛异常
    return false
  }
}

/**
 * 页数是否在分享上限内。超出时界面应隐藏分享按钮并说明原因。
 */
export function withinShareLimit(count, limit = SHARE_FILE_LIMIT) {
  return Number(count) > 0 && Number(count) <= limit
}

/** 用户主动取消分享 —— 不是错误，不该弹提示。 */
export function isShareCancellation(err) {
  return err?.name === 'AbortError'
}

/**
 * 发起分享。**必须**在点击事件处理函数里同步调用（不要在它之前 await）。
 *
 * @returns {Promise<'shared'|'cancelled'|'failed'>} 不抛异常，由调用方决定怎么提示
 */
export function shareFiles(files, { title, nav = globalThis.navigator } = {}) {
  return nav
    .share({ files, title })
    .then(() => 'shared')
    .catch((err) => {
      if (isShareCancellation(err)) return 'cancelled'
      console.error('分享失败:', err)
      return 'failed'
    })
}
