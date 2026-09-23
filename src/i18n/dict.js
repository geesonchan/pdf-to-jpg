/**
 * 全站双语文案。**所有**给用户看的字符串都在这里，代码里不许出现硬编码文案。
 *
 * 结构：TEXT[语言][分组][键]。中英两侧的键必须完全一致 —— 有测试守着（dict.test.js），
 * 漏一条就红，这是验收清单里「中英切换完整，无漏译」的自动化保障。
 *
 * 占位符用 {name}，由 format() 替换。
 *
 * ⚠️ errors 分组必须覆盖 engine/errors.js 的每一个错误码，
 *    pageRangeErrors 必须覆盖 engine/pageRange.js 的每一个失败码，同样有测试守着。
 */

import { MIN_IOS_VERSION } from '../engine/support.js'

export const LANGUAGES = ['zh', 'en']
export const DEFAULT_LANGUAGE = 'en'

/** 浏览器要求，写在一处，提示文案和文档都引用它。 */
export const MIN_BROWSERS = {
  ios: MIN_IOS_VERSION,
  safari: '17.4',
  chrome: '119',
  firefox: '121',
}

export const ISSUES_URL = 'https://github.com/geesonchan/pdf-to-jpg/issues'
export const SOURCE_URL = 'https://github.com/geesonchan/pdf-to-jpg'

export const TEXT = {
  zh: {
    meta: {
      htmlLang: 'zh-CN',
      documentTitle: 'PDF 转 JPG · 免费、不上传',
      description: '把 PDF 的每一页转成 JPG 图片。全部在你的浏览器里完成，文件不会上传。',
      switchTo: 'English',
      switchToLabel: '切换到英文',
    },
    app: {
      title: 'PDF → JPG',
      tagline: '把 PDF 的每一页转成 JPG 图片。免费，无需注册。',
      privacy: '文件只在你的设备上处理，不会上传。',
    },
    drop: {
      label: '把 PDF 拖到这里',
      or: '或者',
      button: '选择文件',
      hint: '一次一个文件',
      active: '松手即可',
      rejectedType: '这不是 PDF 文件。请选择 .pdf 文件。',
      rejectedMultiple: '一次只能处理一个文件，已取第一个。',
    },
    file: {
      change: '换一个文件',
      size: '{size}',
      pages: '共 {n} 页',
      pagesUnknown: '正在读取页数…',
    },
    settings: {
      title: '设置',
      dpi: '分辨率',
      dpiUnit: 'DPI',
      dpiHint: 'DPI 越高图片越清晰，文件也越大。',
      quality: 'JPG 质量',
      qualityHint: '质量越高越清晰，文件也越大。',
      range: '页码范围',
      rangePlaceholder: '留空 = 全部，例如 1-3,5,8-10',
      rangeHint: '用逗号分隔，用短横线表示连续页。',
    },
    action: {
      convert: '开始转换',
      cancel: '取消',
      download: '下载 JPG',
      downloadZip: '下载 ZIP（{n} 张）',
      again: '再转一个',
    },
    progress: {
      preparing: '正在准备…',
      converting: '第 {index} / {total} 页',
      packing: '正在打包 ZIP…',
      done: '完成：{n} 张图片',
      doneSingle: '完成：1 张图片',
      cancelled: '已取消。已完成的页面没有下载。',
      clampedNotice:
        '有 {n} 页超出浏览器的画布上限，已自动降低分辨率。这是浏览器的限制，不是文件的问题。',
    },
    errors: {
      title: '出错了',
      UNSUPPORTED_BROWSER: '你的浏览器不支持这个工具。',
      PDFJS_LOAD_FAILED: 'PDF 处理模块加载失败。请刷新页面重试。',
      WORKER_INIT_FAILED: 'PDF 处理模块启动失败。请刷新页面重试。',
      INVALID_PDF: '这个文件打不开。它可能不是 PDF，或者已经损坏。',
      PASSWORD_REQUIRED: '这个 PDF 有密码保护，暂时还不支持。',
      PASSWORD_INCORRECT: '密码不对。',
      PDF_OPEN_FAILED: '打不开这个 PDF。请换一个文件试试。',
      PAGE_RANGE_INVALID: '页码范围有问题。',
      RENDER_FAILED: '第 {pageNumber} 页渲染失败。',
      CANVAS_ENCODE_FAILED: '生成图片失败。可能是页面太大，试试降低分辨率。',
      CANCELLED: '已取消。',
      UNKNOWN: '出了点意料之外的问题。请刷新页面重试。',
    },
    pageRangeErrors: {
      SYNTAX: '「{token}」看不懂。正确写法像这样：1-3,5,8-10',
      ZERO: '页码从 1 开始，没有第 0 页。',
      REVERSED: '「{token}」的起止反了 —— 起始页要小于等于结束页。',
      OUT_OF_RANGE: '这个 PDF 只有 {totalPages} 页，你要的第 {requested} 页不存在。',
      INVALID_TOTAL: '读不出这个 PDF 的页数。',
    },
    unsupported: {
      iosTitle: '你的 iOS 版本太低',
      iosBody: `这个工具需要 iOS ${MIN_IOS_VERSION} 或更高版本。请在「设置 → 通用 → 软件更新」里升级系统。`,
      iosNote:
        'iPhone 和 iPad 上的所有浏览器都使用同一个系统引擎，换用 Chrome 或 Firefox 不会解决这个问题。',
      iosFeedback: '已经是最新版还看到这条提示？告诉我们',
      desktopTitle: '你的浏览器太旧',
      desktopBody: '这个工具需要 Safari 17.4 及以上，或 Chrome 119 及以上，或 Firefox 121 及以上。',
      desktopNote: '请升级浏览器，或改用最新版的 Chrome、Firefox。',
      desktopFeedback: '浏览器已经是最新版还看到这条提示？告诉我们',
      privacy: '无论是否支持，你的文件都不会被上传 —— 这个工具没有服务器。',
      missing: '缺少的能力：{apis}',
    },
    footer: {
      privacy: '零上传 · 零追踪',
      source: '源代码',
      version: '版本 {version}',
    },
  },

  en: {
    meta: {
      htmlLang: 'en',
      documentTitle: 'PDF to JPG · Free, no uploads',
      description:
        'Turn every page of a PDF into a JPG image. Everything runs in your browser; your files are never uploaded.',
      switchTo: '中文',
      switchToLabel: 'Switch to Chinese',
    },
    app: {
      title: 'PDF → JPG',
      tagline: 'Turn every page of a PDF into a JPG image. Free, no sign-up.',
      privacy: 'Your files are processed on your device and are never uploaded.',
    },
    drop: {
      label: 'Drop a PDF here',
      or: 'or',
      button: 'Choose a file',
      hint: 'One file at a time',
      active: 'Release to add',
      rejectedType: 'That is not a PDF. Please choose a .pdf file.',
      rejectedMultiple: 'One file at a time — using the first one.',
    },
    file: {
      change: 'Use a different file',
      size: '{size}',
      pages: '{n} pages',
      pagesUnknown: 'Reading page count…',
    },
    settings: {
      title: 'Settings',
      dpi: 'Resolution',
      dpiUnit: 'DPI',
      dpiHint: 'Higher DPI means sharper images and bigger files.',
      quality: 'JPG quality',
      qualityHint: 'Higher quality means sharper images and bigger files.',
      range: 'Page range',
      rangePlaceholder: 'Leave empty for all, e.g. 1-3,5,8-10',
      rangeHint: 'Separate with commas, use a dash for a run of pages.',
    },
    action: {
      convert: 'Convert',
      cancel: 'Cancel',
      download: 'Download JPG',
      downloadZip: 'Download ZIP ({n} images)',
      again: 'Convert another',
    },
    progress: {
      preparing: 'Getting ready…',
      converting: 'Page {index} of {total}',
      packing: 'Building the ZIP…',
      done: 'Done — {n} images',
      doneSingle: 'Done — 1 image',
      cancelled: 'Cancelled. Nothing was downloaded.',
      clampedNotice:
        '{n} pages exceeded your browser’s canvas limit and were rendered at a lower resolution. That is a browser limit, not a problem with your file.',
    },
    errors: {
      title: 'Something went wrong',
      UNSUPPORTED_BROWSER: 'Your browser cannot run this tool.',
      PDFJS_LOAD_FAILED: 'The PDF engine failed to load. Please reload the page.',
      WORKER_INIT_FAILED: 'The PDF engine failed to start. Please reload the page.',
      INVALID_PDF: 'This file will not open. It may not be a PDF, or it may be damaged.',
      PASSWORD_REQUIRED: 'This PDF is password protected, which is not supported yet.',
      PASSWORD_INCORRECT: 'That password is not right.',
      PDF_OPEN_FAILED: 'This PDF will not open. Try a different file.',
      PAGE_RANGE_INVALID: 'There is a problem with the page range.',
      RENDER_FAILED: 'Page {pageNumber} failed to render.',
      CANVAS_ENCODE_FAILED:
        'Could not produce the image. The page may be too large — try a lower resolution.',
      CANCELLED: 'Cancelled.',
      UNKNOWN: 'Something unexpected happened. Please reload the page.',
    },
    pageRangeErrors: {
      SYNTAX: '“{token}” is not a page range. It should look like 1-3,5,8-10',
      ZERO: 'Pages start at 1 — there is no page 0.',
      REVERSED: '“{token}” runs backwards — the first page must not be after the last.',
      OUT_OF_RANGE: 'This PDF has {totalPages} pages, so page {requested} does not exist.',
      INVALID_TOTAL: 'Could not read how many pages this PDF has.',
    },
    unsupported: {
      iosTitle: 'Your iOS version is too old',
      iosBody: `This tool needs iOS ${MIN_IOS_VERSION} or later. Update under Settings → General → Software Update.`,
      iosNote:
        'Every browser on iPhone and iPad uses the same system engine, so switching to Chrome or Firefox will not help.',
      iosFeedback: 'Already on the latest version and still seeing this? Let us know',
      desktopTitle: 'Your browser is too old',
      desktopBody: 'This tool needs Safari 17.4+, Chrome 119+, or Firefox 121+.',
      desktopNote: 'Please update your browser, or switch to an up-to-date Chrome or Firefox.',
      desktopFeedback: 'Already on the latest browser and still seeing this? Let us know',
      privacy: 'Either way, your files are never uploaded — this tool has no server.',
      missing: 'Missing capabilities: {apis}',
    },
    footer: {
      privacy: 'No uploads · No tracking',
      source: 'Source code',
      version: 'Version {version}',
    },
  },
}

/** 把 {name} 占位符替换掉。缺失的变量原样保留，方便测试时发现。 */
export function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : match
  )
}

/**
 * 取一条文案。
 * @param {'zh'|'en'} lang
 * @param {string} path 形如 'settings.dpi'
 * @param {object} [vars] 占位符变量
 */
export function t(lang, path, vars) {
  const dict = TEXT[lang] ?? TEXT[DEFAULT_LANGUAGE]
  const [group, key] = path.split('.')
  const value = dict?.[group]?.[key]
  if (value === undefined) {
    // 开发期立刻暴露漏翻，而不是在界面上显示 undefined
    console.error(`[i18n] 缺少文案: ${lang}.${path}`)
    return path
  }
  return vars ? format(value, vars) : value
}

/** 按平台取一整组「不支持」文案。 */
export function unsupportedText(platform, lang) {
  const prefix = platform === 'ios' ? 'ios' : 'desktop'
  return {
    title: t(lang, `unsupported.${prefix}Title`),
    body: t(lang, `unsupported.${prefix}Body`),
    note: t(lang, `unsupported.${prefix}Note`),
    feedback: t(lang, `unsupported.${prefix}Feedback`),
    privacy: t(lang, 'unsupported.privacy'),
    issuesUrl: ISSUES_URL,
  }
}
