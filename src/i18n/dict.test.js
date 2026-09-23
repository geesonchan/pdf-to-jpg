import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  ISSUES_URL,
  LANGUAGES,
  TEXT,
  format,
  t,
  unsupportedText,
} from './dict.js'
import { ENGINE_ERROR_CODES } from '../engine/errors.js'
import { MIN_IOS_VERSION } from '../engine/support.js'

/** 把嵌套字典拍平成 'group.key' 列表。 */
function leafKeys(dict) {
  const keys = []
  for (const [group, entries] of Object.entries(dict)) {
    for (const key of Object.keys(entries)) keys.push(`${group}.${key}`)
  }
  return keys.sort()
}

describe('字典完整性（验收：中英切换完整，无漏译）', () => {
  it('中英两侧的键完全一致', () => {
    expect(leafKeys(TEXT.zh)).toEqual(leafKeys(TEXT.en))
  })

  it.each(LANGUAGES)('%s 的每一条文案都是非空字符串', (lang) => {
    for (const path of leafKeys(TEXT[lang])) {
      const [group, key] = path.split('.')
      const value = TEXT[lang][group][key]
      expect(typeof value, path).toBe('string')
      expect(value.trim().length, path).toBeGreaterThan(0)
    }
  })

  it('中文文案确实是中文，英文文案里不混中文', () => {
    const skip = new Set(['meta.switchTo', 'app.title'])
    for (const path of leafKeys(TEXT.zh)) {
      if (skip.has(path)) continue
      const [group, key] = path.split('.')
      expect(TEXT.en[group][key], `en.${path} 混入了中文`).not.toMatch(/[一-龥]/)
    }
  })

  it('两侧的占位符一一对应 —— 否则切换语言后变量会漏掉', () => {
    const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const path of leafKeys(TEXT.zh)) {
      const [group, key] = path.split('.')
      expect(placeholders(TEXT.zh[group][key]), `${path} 的占位符不一致`).toEqual(
        placeholders(TEXT.en[group][key])
      )
    }
  })
})

describe('错误码覆盖（不能出现没有文案的错误）', () => {
  it.each(LANGUAGES)('%s 覆盖了 engine/errors.js 的全部错误码', (lang) => {
    for (const code of Object.values(ENGINE_ERROR_CODES)) {
      expect(TEXT[lang].errors[code], `${lang}.errors.${code} 缺失`).toBeTruthy()
    }
  })

  it.each(LANGUAGES)('%s 覆盖了 pageRange 的全部失败码', (lang) => {
    for (const code of ['SYNTAX', 'ZERO', 'REVERSED', 'OUT_OF_RANGE', 'INVALID_TOTAL']) {
      expect(TEXT[lang].pageRangeErrors[code], `${lang}.pageRangeErrors.${code} 缺失`).toBeTruthy()
    }
  })

  it.each(LANGUAGES)('%s 有兜底的 UNKNOWN 文案', (lang) => {
    expect(TEXT[lang].errors.UNKNOWN).toBeTruthy()
  })
})

describe('format 占位符替换', () => {
  it('替换单个与多个变量', () => {
    expect(format('第 {index} / {total} 页', { index: 3, total: 10 })).toBe('第 3 / 10 页')
  })

  it('缺失的变量原样保留，便于发现问题', () => {
    expect(format('共 {n} 页', {})).toBe('共 {n} 页')
  })

  it('没有占位符时原样返回', () => {
    expect(format('开始转换')).toBe('开始转换')
  })

  it('数字 0 与空字符串会被正常替换，不会被当成缺失', () => {
    expect(format('{n}', { n: 0 })).toBe('0')
    expect(format('[{s}]', { s: '' })).toBe('[]')
  })
})

describe('t() 取文案', () => {
  it('取到对应语言的文案', () => {
    expect(t('zh', 'action.convert')).toBe('开始转换')
    expect(t('en', 'action.convert')).toBe('Convert')
  })

  it('带变量', () => {
    expect(t('zh', 'progress.converting', { index: 2, total: 7 })).toBe('第 2 / 7 页')
  })

  it('未知语言回退到默认语言', () => {
    expect(t('fr', 'action.convert')).toBe(TEXT[DEFAULT_LANGUAGE].action.convert)
  })

  it('未知键返回键名而不是 undefined', () => {
    expect(t('zh', 'nope.nothing')).toBe('nope.nothing')
  })
})

describe('不支持文案（延续 D21 的约定）', () => {
  it.each(LANGUAGES)('%s 的 iOS 文案给出与 support.js 一致的版本号', (lang) => {
    expect(unsupportedText('ios', lang).body).toContain(MIN_IOS_VERSION)
  })

  it('iOS 文案说明换浏览器无效，且不建议换浏览器', () => {
    expect(TEXT.zh.unsupported.iosNote).toMatch(/不会解决/)
    expect(TEXT.en.unsupported.iosNote).toMatch(/will not help/i)
    expect(TEXT.zh.unsupported.iosBody).not.toMatch(/Chrome|Firefox/)
    expect(TEXT.en.unsupported.iosBody).not.toMatch(/Chrome|Firefox/)
  })

  it('桌面文案给出换浏览器这条路', () => {
    for (const lang of LANGUAGES) {
      expect(TEXT[lang].unsupported.desktopNote).toMatch(/Chrome|Firefox/)
    }
  })

  it('两种平台都返回完整可渲染的对象', () => {
    for (const lang of LANGUAGES) {
      for (const platform of ['ios', 'desktop']) {
        const u = unsupportedText(platform, lang)
        expect(u.title).toBeTruthy()
        expect(u.body).toBeTruthy()
        expect(u.note).toBeTruthy()
        expect(u.feedback).toBeTruthy()
        expect(u.privacy).toBeTruthy()
        expect(u.issuesUrl).toBe(ISSUES_URL)
      }
    }
  })

  it('未知平台按桌面处理', () => {
    expect(unsupportedText('toaster', 'zh').title).toBe(TEXT.zh.unsupported.desktopTitle)
  })
})
