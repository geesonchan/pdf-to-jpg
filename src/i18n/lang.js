/**
 * 语言选择：默认跟随浏览器，可手动切换，选择记在本地。
 *
 * 用 localStorage 存偏好 —— 同源存储，不产生任何网络请求，不违反 C1/C4。
 * 读写都包 try/catch：Safari 隐私模式、禁用站点数据时访问 localStorage 会抛异常。
 */

import { DEFAULT_LANGUAGE, LANGUAGES } from './dict.js'

export const STORAGE_KEY = 'pdf-to-jpg.lang'

/**
 * 从浏览器语言列表里挑一个我们支持的。纯函数。
 * @param {string[]} [preferred] 形如 navigator.languages
 */
export function detectLanguage(preferred = []) {
  for (const tag of preferred) {
    const lower = String(tag ?? '').toLowerCase()
    if (lower.startsWith('zh')) return 'zh'
    if (lower.startsWith('en')) return 'en'
  }
  return DEFAULT_LANGUAGE
}

/** 只接受我们支持的语言，其余一律当作没存过。 */
export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : null
}

export function readStoredLanguage(storage) {
  try {
    return normalizeLanguage(storage?.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function storeLanguage(storage, lang) {
  try {
    storage?.setItem(STORAGE_KEY, lang)
    return true
  } catch {
    return false // 隐私模式下存不了，不影响本次使用
  }
}

/**
 * 决定本次使用哪种语言：存过的优先，否则跟随浏览器。纯函数。
 * @param {string|null} stored
 * @param {string[]} preferred
 */
export function resolveLanguage(stored, preferred) {
  return normalizeLanguage(stored) ?? detectLanguage(preferred)
}

/** 另一种语言，供切换按钮使用。 */
export function otherLanguage(lang) {
  return lang === 'zh' ? 'en' : 'zh'
}
