import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  detectLanguage,
  normalizeLanguage,
  otherLanguage,
  readStoredLanguage,
  resolveLanguage,
  storeLanguage,
} from './lang.js'

/** 假的 localStorage，可切换成会抛异常（模拟隐私模式）。 */
function fakeStorage({ throwing = false, initial = {} } = {}) {
  const data = { ...initial }
  return {
    getItem(key) {
      if (throwing) throw new DOMException('denied')
      return Object.hasOwn(data, key) ? data[key] : null
    },
    setItem(key, value) {
      if (throwing) throw new DOMException('denied')
      data[key] = String(value)
    },
    _data: data,
  }
}

describe('detectLanguage', () => {
  it.each([
    [['zh-CN'], 'zh'],
    [['zh-TW'], 'zh'],
    [['zh'], 'zh'],
    [['en-US'], 'en'],
    [['en'], 'en'],
  ])('%s → %s', (preferred, expected) => {
    expect(detectLanguage(preferred)).toBe(expected)
  })

  it('取列表里第一个能识别的', () => {
    expect(detectLanguage(['fr-FR', 'zh-CN', 'en-US'])).toBe('zh')
    expect(detectLanguage(['de', 'en-GB', 'zh'])).toBe('en')
  })

  it('大小写不敏感', () => {
    expect(detectLanguage(['ZH-hans-CN'])).toBe('zh')
  })

  it('都不认识时回退到英文', () => {
    expect(detectLanguage(['fr', 'de', 'ja'])).toBe('en')
    expect(detectLanguage([])).toBe('en')
    expect(detectLanguage()).toBe('en')
  })

  it('脏数据不会让它崩', () => {
    expect(() => detectLanguage([null, undefined, 123, {}])).not.toThrow()
    expect(detectLanguage([null, undefined])).toBe('en')
  })
})

describe('normalizeLanguage', () => {
  it('只放行支持的语言', () => {
    expect(normalizeLanguage('zh')).toBe('zh')
    expect(normalizeLanguage('en')).toBe('en')
    expect(normalizeLanguage('fr')).toBeNull()
    expect(normalizeLanguage('')).toBeNull()
    expect(normalizeLanguage(null)).toBeNull()
  })
})

describe('localStorage 读写', () => {
  it('存了就能读回来', () => {
    const storage = fakeStorage()
    expect(storeLanguage(storage, 'zh')).toBe(true)
    expect(storage._data[STORAGE_KEY]).toBe('zh')
    expect(readStoredLanguage(storage)).toBe('zh')
  })

  it('没存过时返回 null', () => {
    expect(readStoredLanguage(fakeStorage())).toBeNull()
  })

  it('存着脏值时当作没存过', () => {
    expect(readStoredLanguage(fakeStorage({ initial: { [STORAGE_KEY]: 'klingon' } }))).toBeNull()
  })

  it('隐私模式下读写抛异常也不崩', () => {
    const hostile = fakeStorage({ throwing: true })
    expect(() => readStoredLanguage(hostile)).not.toThrow()
    expect(readStoredLanguage(hostile)).toBeNull()
    expect(storeLanguage(hostile, 'zh')).toBe(false)
  })

  it('storage 本身不存在时也不崩', () => {
    expect(readStoredLanguage(undefined)).toBeNull()
    expect(storeLanguage(undefined, 'zh')).toBe(true)
  })
})

describe('resolveLanguage 优先级', () => {
  it('存过的优先于浏览器语言', () => {
    expect(resolveLanguage('en', ['zh-CN'])).toBe('en')
    expect(resolveLanguage('zh', ['en-US'])).toBe('zh')
  })

  it('没存过时跟随浏览器', () => {
    expect(resolveLanguage(null, ['zh-CN'])).toBe('zh')
    expect(resolveLanguage(null, ['en-US'])).toBe('en')
  })

  it('存的是脏值时也跟随浏览器', () => {
    expect(resolveLanguage('klingon', ['zh-CN'])).toBe('zh')
  })
})

describe('otherLanguage', () => {
  it('在两种语言之间切换', () => {
    expect(otherLanguage('zh')).toBe('en')
    expect(otherLanguage('en')).toBe('zh')
  })
})
