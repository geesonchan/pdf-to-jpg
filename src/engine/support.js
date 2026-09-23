/**
 * 浏览器支持探测 —— 第一道防线。
 *
 * 我们用 pdfjs-dist 的 **legacy** 构建（DECISIONS.md D21）。legacy 不做语法降级，
 * 它做的是给较新的运行时 API 补 core-js polyfill。所以这里**只探测 legacy 没有补的 API**，
 * 补过的不能探测 —— 例如 `Math.sumPrecise` 在 iOS 18 上原生不存在，但 legacy 会补上，
 * 若把它列进来会把完全能用的浏览器误判为不支持。
 *
 * legacy 已补（故意不列入探测）：Math.sumPrecise、Iterator 构造器与 Iterator helpers。
 * legacy 未补（下面逐项探测）：Promise.withResolvers。
 *
 * ⚠️ 升级 pdfjs-dist 时必须重新核对这张表 —— 核对步骤见 CLAUDE.md 工作规则第 8 条。
 */

/** 这张表是针对这个版本核对的。版本一变，结论可能就变。 */
export const CHECKED_AGAINST_PDFJS = '6.3.289'

/** pdf.js legacy 版需要、但 core-js **没有**补的 API。 */
export const PDFJS_FEATURES = [
  {
    id: 'promise-with-resolvers',
    api: 'Promise.withResolvers',
    since: { ios: '17.4', safari: '17.4', chrome: '119', firefox: '121' },
    test: (g) => typeof g.Promise?.withResolvers === 'function',
  },
]

/** 本应用自己需要的浏览器能力。 */
export const APP_FEATURES = [
  {
    id: 'canvas-to-blob',
    api: 'HTMLCanvasElement.prototype.toBlob',
    since: { ios: '11', safari: '11', chrome: '50', firefox: '19' },
    test: (g) => typeof g.HTMLCanvasElement?.prototype?.toBlob === 'function',
  },
  {
    id: 'worker',
    api: 'Worker',
    since: { ios: '5', safari: '4', chrome: '4', firefox: '3.5' },
    test: (g) => typeof g.Worker === 'function',
  },
  {
    id: 'abort-controller',
    api: 'AbortController',
    since: { ios: '11.3', safari: '11.1', chrome: '66', firefox: '57' },
    test: (g) => typeof g.AbortController === 'function',
  },
]

export const ALL_FEATURES = [...PDFJS_FEATURES, ...APP_FEATURES]

/** 整站要求的最低 iOS 版本，由上表中最高的 ios 值决定；提示文案直接用它。 */
export const MIN_IOS_VERSION = '17.4'

/**
 * 判断平台。iOS 上所有浏览器都被强制使用同一个 WebKit 引擎，
 * 所以「换个浏览器试试」对 iOS 用户是无效建议 —— 提示文案必须按平台分。
 */
export function detectPlatform({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  // iPadOS 13 起默认把自己报成桌面 Mac，靠触控点数区分
  if (/Macintosh|MacIntel/i.test(`${userAgent} ${platform}`) && maxTouchPoints > 1) return 'ios'
  return 'desktop'
}

/** 收集真实运行环境。测试不调用它，直接注入 env。 */
export function currentEnv() {
  const g = typeof globalThis === 'undefined' ? {} : globalThis
  const nav = g.navigator ?? {}
  return {
    globals: g,
    userAgent: nav.userAgent ?? '',
    platform: nav.platform ?? '',
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  }
}

/**
 * @param {object} [env] 由 currentEnv() 提供；测试可注入
 * @returns {{supported: boolean, platform: 'ios'|'desktop', missing: object[]}}
 */
export function detectSupport(env = currentEnv()) {
  const globals = env.globals ?? {}
  const missing = ALL_FEATURES.filter((feature) => {
    try {
      return !feature.test(globals)
    } catch {
      // 探测本身抛异常（例如全局对象被扩展改写过）一律算不支持
      return true
    }
  })

  return {
    supported: missing.length === 0,
    platform: detectPlatform(env),
    missing: missing.map(({ id, api, since }) => ({ id, api, since })),
  }
}
