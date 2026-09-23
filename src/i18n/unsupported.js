/**
 * 「浏览器不支持」提示文案。按平台区分，中英双语。
 *
 * 为什么 iOS 和桌面分开写：iOS 上所有浏览器（包括 Chrome、Firefox、Edge）
 * 都被 App Store 规则强制使用系统的 WebKit 引擎，所以对 iOS 用户说
 * 「换个浏览器」是无效建议，只能让他们升级系统。
 *
 * 反馈链接是普通 <a href>，用户不点就不会产生任何请求，不违反约束 C1/C4。
 */

import { MIN_IOS_VERSION } from '../engine/support.js'

export const ISSUES_URL = 'https://github.com/geesonchan/pdf-to-jpg/issues'

export const UNSUPPORTED_TEXT = {
  zh: {
    ios: {
      title: '你的 iOS 版本太低',
      body: `这个工具需要 iOS ${MIN_IOS_VERSION} 或更高版本。请在「设置 → 通用 → 软件更新」里升级系统。`,
      note: 'iPhone 和 iPad 上的所有浏览器都使用同一个系统引擎，换用 Chrome 或 Firefox 不会解决这个问题。',
      feedback: '已经是最新版还看到这条提示？告诉我们',
    },
    desktop: {
      title: '你的浏览器太旧',
      body: '这个工具需要较新的浏览器：Safari 17.4 及以上，或 Chrome 119 及以上，或 Firefox 121 及以上。',
      note: '请升级浏览器，或改用最新版的 Chrome、Firefox。',
      feedback: '浏览器已经是最新版还看到这条提示？告诉我们',
    },
    privacy: '无论是否支持，你的文件都不会被上传 —— 这个工具没有服务器。',
  },
  en: {
    ios: {
      title: 'Your iOS version is too old',
      body: `This tool needs iOS ${MIN_IOS_VERSION} or later. Update under Settings → General → Software Update.`,
      note: 'Every browser on iPhone and iPad uses the same system engine, so switching to Chrome or Firefox will not help.',
      feedback: 'Already on the latest version and still seeing this? Let us know',
    },
    desktop: {
      title: 'Your browser is too old',
      body: 'This tool needs Safari 17.4+, Chrome 119+, or Firefox 121+.',
      note: 'Please update your browser, or switch to an up-to-date Chrome or Firefox.',
      feedback: 'Already on the latest browser and still seeing this? Let us know',
    },
    privacy: 'Either way, your files are never uploaded — this tool has no server.',
  },
}

/**
 * 取出一份可直接渲染的文案。
 * @param {'ios'|'desktop'} platform
 * @param {'zh'|'en'} lang
 */
export function unsupportedText(platform, lang) {
  const dict = UNSUPPORTED_TEXT[lang] ?? UNSUPPORTED_TEXT.en
  const forPlatform = dict[platform] ?? dict.desktop
  return { ...forPlatform, privacy: dict.privacy, issuesUrl: ISSUES_URL }
}
