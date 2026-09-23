/**
 * WCAG 对比度计算。纯函数。
 *
 * 用处不是运行时算颜色，而是让「达到 AA」变成一条能跑的测试：
 * 颜色令牌一旦被改回低对比度，测试就红。
 *
 * 参考阈值（WCAG 2.2）：
 *   1.4.3 正文文字 ≥ 4.5:1，大号文字 ≥ 3:1
 *   1.4.11 非文字界面组件（按钮边框、输入框边界等）≥ 3:1
 */

export const AA_TEXT = 4.5
export const AA_LARGE_TEXT = 3
export const AA_NON_TEXT = 3

/** '#rrggbb' 或 '#rgb' → [r, g, b] */
export function parseHex(hex) {
  const value = String(hex).trim().replace(/^#/, '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new RangeError(`不是合法的十六进制颜色: ${hex}`)
  }
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16))
}

/** 相对亮度，WCAG 定义。 */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 两个颜色的对比度，范围 1–21。
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const [lighter, darker] = [
    relativeLuminance(parseHex(a)),
    relativeLuminance(parseHex(b)),
  ].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/** 便于测试断言时读出更有意义的失败信息。 */
export function meetsContrast(foreground, background, threshold = AA_TEXT) {
  return contrastRatio(foreground, background) >= threshold
}
