/**
 * 界面层。
 *
 * 职责边界：引擎只给错误码，这里负责翻译成人话；文案全部来自 i18n/dict.js，
 * 本文件里不出现任何硬编码的中英文字符串。
 */

import './style.css'
import { convertPdfToJpegs } from './engine/convert.js'
import { EngineError, isBrowserLevelFailure } from './engine/errors.js'
import { makePageFilename, makeZipFilename } from './engine/filename.js'
import { detectSupport } from './engine/support.js'
import { SOURCE_URL, TEXT, t, unsupportedText } from './i18n/dict.js'
import {
  otherLanguage,
  readStoredLanguage,
  resolveLanguage,
  storeLanguage,
} from './i18n/lang.js'
import { buildZip, shouldZip, triggerDownload } from './ui/download.js'
import { formatBytes, normalizeDpi, normalizeQuality, progressPercent } from './ui/format.js'

const $ = (id) => document.getElementById(id)

/** 结果缩略图最多显示这么多张 —— 每张都要占一个 object URL，不能无限放。 */
const MAX_THUMBS = 12

const state = {
  lang: 'en',
  file: null,
  results: [], // { name, blob }
  thumbUrls: [],
  clampedCount: 0,
  controller: null,
}

// ─────────────────────────── 语言 ───────────────────────────

function applyLanguage(lang) {
  state.lang = lang
  const meta = TEXT[lang].meta

  document.documentElement.lang = meta.htmlLang
  document.title = meta.documentTitle
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(lang, el.dataset.i18n)
  }
  $('range').placeholder = t(lang, 'settings.rangePlaceholder')
  $('lang-toggle').setAttribute('aria-label', meta.switchToLabel)
  $('source-link').href = SOURCE_URL
  $('version').textContent = t(lang, 'footer.version', { version: __APP_VERSION__ })

  // 动态文案不带 data-i18n，切换语言时要手动重刷
  renderFileCard()
  renderDoneStep()
  renderUnsupportedPanel()
}

function switchLanguage() {
  const next = otherLanguage(state.lang)
  storeLanguage(globalThis.localStorage, next)
  applyLanguage(next)
}

// ─────────────────────────── 步骤切换 ───────────────────────────

const STEPS = ['step-pick', 'step-configure', 'step-progress', 'step-done']

function showStep(id) {
  for (const step of STEPS) {
    $(step).hidden = step !== id
  }
  $('error-panel').hidden = true
}

// ─────────────────────────── 不支持面板 ───────────────────────────

let unsupportedInfo = null

function renderUnsupportedPanel() {
  if (!unsupportedInfo) return
  const text = unsupportedText(unsupportedInfo.platform, state.lang)

  $('unsupported-title').textContent = text.title
  $('unsupported-body').textContent = text.body
  $('unsupported-note').textContent = text.note
  $('unsupported-privacy').textContent = text.privacy

  const link = $('unsupported-feedback')
  link.textContent = text.feedback
  link.href = text.issuesUrl

  const apis = unsupportedInfo.missing.map((m) => m.api).join(', ')
  $('unsupported-missing').textContent = apis
    ? t(state.lang, 'unsupported.missing', { apis })
    : ''
}

/** 两道防线共用这一个出口：特性探测失败，或 pdf.js / worker 加载失败。 */
function showUnsupported(info) {
  unsupportedInfo = info
  renderUnsupportedPanel()
  $('unsupported').hidden = false
  $('app').hidden = true
}

// ─────────────────────────── 选文件 ───────────────────────────

function renderFileCard() {
  if (!state.file) return
  $('file-name').textContent = state.file.name
  $('file-meta').textContent = formatBytes(state.file.size)
}

function acceptFile(file) {
  if (!file) return

  const looksLikePdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) {
    showError(t(state.lang, 'drop.rejectedType'))
    return
  }

  state.file = file
  resetResults()
  renderFileCard()
  showStep('step-configure')
}

function handleFileList(list) {
  if (!list || list.length === 0) return
  acceptFile(list[0])
}

// ─────────────────────────── 转换 ───────────────────────────

function readOptions() {
  const dpiInput = document.querySelector('input[name="dpi"]:checked')
  return {
    dpi: normalizeDpi(dpiInput?.value),
    quality: normalizeQuality($('quality').value),
    pageRange: $('range').value,
  }
}

function setProgress(done, total, label) {
  const percent = progressPercent(done, total)
  $('progress-fill').style.width = `${percent}%`
  $('progressbar').setAttribute('aria-valuenow', String(Math.round(percent)))
  $('progress-text').textContent = label
}

async function convert() {
  if (!state.file) return

  resetResults()
  state.controller = new AbortController()
  showStep('step-progress')
  setProgress(0, 1, t(state.lang, 'progress.preparing'))

  try {
    const buffer = await state.file.arrayBuffer()

    for await (const page of convertPdfToJpegs(buffer, readOptions(), {
      signal: state.controller.signal,
    })) {
      if (page.clamped) state.clampedCount += 1

      state.results.push({
        name: makePageFilename(state.file.name, page.pageNumber, page.totalPages),
        blob: page.blob,
      })

      setProgress(
        page.index,
        page.total,
        t(state.lang, 'progress.converting', { index: page.index, total: page.total })
      )
    }

    renderThumbs()
    renderDoneStep()
    showStep('step-done')
  } catch (err) {
    handleConversionError(err)
  } finally {
    state.controller = null
  }
}

function handleConversionError(err) {
  if (err instanceof EngineError && err.code === 'CANCELLED') {
    resetResults()
    showStep('step-configure')
    return
  }

  if (isBrowserLevelFailure(err)) {
    // 第二道防线：引擎加载不起来，走和特性探测同一个出口
    showUnsupported(detectSupport())
    return
  }

  showError(describeError(err))
}

/** 把错误码翻译成用户能看懂的一句话。 */
function describeError(err) {
  if (!(err instanceof EngineError)) {
    console.error(err)
    return t(state.lang, 'errors.UNKNOWN')
  }

  if (err.code === 'PAGE_RANGE_INVALID') {
    const reason = err.detail?.reason
    if (reason && TEXT[state.lang].pageRangeErrors[reason]) {
      return t(state.lang, `pageRangeErrors.${reason}`, err.detail)
    }
    return t(state.lang, 'errors.PAGE_RANGE_INVALID')
  }

  if (TEXT[state.lang].errors[err.code]) {
    return t(state.lang, `errors.${err.code}`, err.detail)
  }

  console.error(err)
  return t(state.lang, 'errors.UNKNOWN')
}

function showError(message) {
  $('error-text').textContent = message
  $('error-panel').hidden = false
  for (const step of STEPS) $(step).hidden = true
}

// ─────────────────────────── 结果与下载 ───────────────────────────

function resetResults() {
  for (const url of state.thumbUrls) URL.revokeObjectURL(url)
  state.thumbUrls = []
  state.results = []
  state.clampedCount = 0
  $('thumbs').replaceChildren()
  $('clamped-note').hidden = true
}

function renderThumbs() {
  const fragment = document.createDocumentFragment()
  for (const result of state.results.slice(0, MAX_THUMBS)) {
    const url = URL.createObjectURL(result.blob)
    state.thumbUrls.push(url)

    const img = document.createElement('img')
    img.src = url
    img.alt = result.name
    img.loading = 'lazy'
    img.className = 'thumb'
    fragment.append(img)
  }
  $('thumbs').replaceChildren(fragment)
}

function renderDoneStep() {
  const count = state.results.length
  if (count === 0) return

  $('done-text').textContent =
    count === 1 ? t(state.lang, 'progress.doneSingle') : t(state.lang, 'progress.done', { n: count })

  $('download').textContent = shouldZip(count)
    ? t(state.lang, 'action.downloadZip', { n: count })
    : t(state.lang, 'action.download')

  const note = $('clamped-note')
  if (state.clampedCount > 0) {
    note.textContent = t(state.lang, 'progress.clampedNotice', { n: state.clampedCount })
    note.hidden = false
  } else {
    note.hidden = true
  }
}

async function download() {
  const count = state.results.length
  if (count === 0) return

  if (!shouldZip(count)) {
    triggerDownload(state.results[0].blob, state.results[0].name)
    return
  }

  const button = $('download')
  button.disabled = true
  try {
    setProgress(0, 100, t(state.lang, 'progress.packing'))
    $('step-done').hidden = true
    $('step-progress').hidden = false
    $('cancel').hidden = true

    const zip = await buildZip(state.results, (percent) => {
      setProgress(percent, 100, t(state.lang, 'progress.packing'))
    })
    triggerDownload(zip, makeZipFilename(state.file.name))
  } catch (err) {
    showError(describeError(err))
    return
  } finally {
    button.disabled = false
    $('cancel').hidden = false
    $('step-progress').hidden = true
    $('step-done').hidden = false
  }
}

function startOver() {
  resetResults()
  state.file = null
  $('file-input').value = ''
  showStep('step-pick')
}

// ─────────────────────────── 事件绑定 ───────────────────────────

function wireEvents() {
  $('lang-toggle').addEventListener('click', switchLanguage)

  const dropzone = $('dropzone')
  const fileInput = $('file-input')

  dropzone.addEventListener('click', () => fileInput.click())
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInput.click()
    }
  })
  fileInput.addEventListener('change', () => handleFileList(fileInput.files))

  for (const type of ['dragenter', 'dragover']) {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault()
      dropzone.classList.add('is-active')
    })
  }
  for (const type of ['dragleave', 'drop']) {
    dropzone.addEventListener(type, () => dropzone.classList.remove('is-active'))
  }
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    handleFileList(event.dataTransfer?.files)
  })
  // 拖到页面其它地方不要让浏览器直接打开文件
  for (const type of ['dragover', 'drop']) {
    window.addEventListener(type, (event) => event.preventDefault())
  }

  $('change-file').addEventListener('click', startOver)
  $('convert').addEventListener('click', convert)
  $('cancel').addEventListener('click', () => state.controller?.abort())
  $('download').addEventListener('click', download)
  $('again').addEventListener('click', startOver)
  $('error-dismiss').addEventListener('click', () => {
    $('error-panel').hidden = true
    showStep(state.file ? 'step-configure' : 'step-pick')
  })

  const quality = $('quality')
  quality.addEventListener('input', () => {
    $('quality-value').textContent = normalizeQuality(quality.value).toFixed(2)
  })
}

// ─────────────────────────── 启动 ───────────────────────────

const initialLang = resolveLanguage(
  readStoredLanguage(globalThis.localStorage),
  navigator.languages ?? [navigator.language]
)

applyLanguage(initialLang)
wireEvents()

const support = detectSupport()
if (support.supported) {
  $('app').hidden = false
  showStep('step-pick')
} else {
  // 第一道防线：连 pdf.js 都不加载
  showUnsupported(support)
}
