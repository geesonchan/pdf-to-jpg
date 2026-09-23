/**
 * 界面用的格式化工具。纯函数，方便测试。
 */

/**
 * 文件大小。用 1024 进制（和操作系统显示一致）。
 * @param {number} bytes
 * @returns {string} 例如 "1.2 MB"
 */
export function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${Math.round(n)} B`

  const units = ['KB', 'MB', 'GB']
  let value = n / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  // 小于 10 时给一位小数，否则取整 —— 避免 "1024.0 KB" 这种没信息量的精度
  const text = value < 10 ? value.toFixed(1) : String(Math.round(value))
  return `${text} ${units[unit]}`
}

/**
 * 进度百分比，限制在 0–100。
 * @param {number} done
 * @param {number} total
 */
export function progressPercent(done, total) {
  if (!(total > 0)) return 0
  const pct = (done / total) * 100
  return Math.max(0, Math.min(100, pct))
}

/**
 * 质量滑块的取值：0.5–0.95，步进 0.05。
 * 返回规整后的值，避免浮点数尾巴（0.8500000000000001）传给 toBlob。
 */
export function normalizeQuality(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0.85
  const clamped = Math.max(0.5, Math.min(0.95, n))
  return Math.round(clamped * 100) / 100
}

/** DPI 只接受界面上提供的三档。 */
export const DPI_CHOICES = [72, 150, 300]

export function normalizeDpi(value) {
  const n = Number(value)
  return DPI_CHOICES.includes(n) ? n : 150
}
