/**
 * 阶段 1 的临时调试页逻辑。
 *
 * 只是为了在真实浏览器里验证引擎能跑通，不是产品界面 —— 界面是阶段 2 的事。
 * 这个文件不进生产构建：Vite 默认只把 index.html 作为入口。
 *
 * 可用的模拟参数（用于在新设备上看「不支持」面板长什么样）：
 *   /debug.html?simulate=ios
 *   /debug.html?simulate=desktop
 */

import './style.css'
import { convertPdfToJpegs } from './engine/convert.js'
import { EngineError, isBrowserLevelFailure } from './engine/errors.js'
import { makePageFilename } from './engine/filename.js'
import { detectSupport } from './engine/support.js'
import { unsupportedText } from './i18n/dict.js'

const $ = (id) => document.getElementById(id)
const lang = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'

let controller = null

/** 渲染「浏览器不支持」面板。两道防线共用同一个出口。 */
function showUnsupported(platform, missing = []) {
  const t = unsupportedText(platform, lang)
  const panel = $('support-panel')
  panel.hidden = false
  panel.className = 'support-panel'
  panel.innerHTML = `
    <h2></h2>
    <p class="body"></p>
    <p class="note"></p>
    <p class="privacy"></p>
    <p><a class="feedback" rel="noopener"></a></p>
    <p class="missing"></p>
  `
  panel.querySelector('h2').textContent = t.title
  panel.querySelector('.body').textContent = t.body
  panel.querySelector('.note').textContent = t.note
  panel.querySelector('.privacy').textContent = t.privacy
  const link = panel.querySelector('.feedback')
  link.textContent = t.feedback
  link.href = t.issuesUrl
  panel.querySelector('.missing').textContent = missing.length
    ? `缺失: ${missing.map((m) => m.api).join(', ')}`
    : ''
  $('run').disabled = true
}

function setStatus(text) {
  $('status').textContent = text
}

function describeEngineError(err) {
  if (!(err instanceof EngineError)) return `未预期的错误: ${err?.message ?? err}`
  const detail = JSON.stringify(err.detail ?? {})
  return `${err.code} ${detail === '{}' ? '' : detail}`
}

/** 开发服务器上直接取样本文件，省掉手工选文件。仅调试页使用，不进生产构建。 */
async function pickSource() {
  const chosen = $('file').files?.[0]
  if (chosen) return { name: chosen.name, buffer: await chosen.arrayBuffer() }

  const fixture = $('fixture').value
  if (!fixture) return null

  const res = await fetch(`${import.meta.env.BASE_URL}fixtures/generated/${fixture}`)
  if (!res.ok) {
    throw new Error(`取样本失败 (${res.status})，先跑 npm run fixtures`)
  }
  return { name: fixture, buffer: await res.arrayBuffer() }
}

async function run() {
  controller = new AbortController()
  $('run').disabled = true
  $('cancel').disabled = false
  $('results').replaceChildren()

  const started = performance.now()
  let count = 0
  let file = { name: 'document.pdf' }
  const diagnostics = []

  try {
    const source = await pickSource()
    if (!source) {
      setStatus('先选一个 PDF 文件，或从下拉里挑一个样本。')
      return
    }
    file = { name: source.name }

    const buffer = source.buffer
    const options = {
      dpi: Number($('dpi').value),
      quality: Number($('quality').value),
      pageRange: $('range').value,
      password: $('password').value || undefined,
    }

    for await (const page of convertPdfToJpegs(buffer, options, { signal: controller.signal })) {
      count += 1
      setStatus(
        `第 ${page.index} / ${page.total} 页 · ${page.width}×${page.height}` +
          (page.clamped ? ' · 已自动降采样' : '')
      )

      // 诊断表：回答「这一页为什么被降采样」
      const s = page.source
      diagnostics.push({
        页: page.pageNumber,
        '页面尺寸(点)': `${s.widthPt.toFixed(1)} × ${s.heightPt.toFixed(1)}`,
        DPI: Math.round(s.requestedScale * 72),
        '请求缩放': s.requestedScale.toFixed(4),
        '原始像素': `${s.requestedWidth}×${s.requestedHeight} = ${(s.requestedWidth * s.requestedHeight / 1e6).toFixed(2)}M`,
        '上限': `${(s.maxPixels / 1e6).toFixed(2)}M`,
        '实际输出': `${page.width}×${page.height}`,
        '是否降采样': page.clamped ? '是' : '否',
      })

      const name = makePageFilename(file.name, page.pageNumber, page.totalPages)
      const url = URL.createObjectURL(page.blob)

      const card = document.createElement('figure')
      card.className = 'result'
      const img = document.createElement('img')
      img.src = url
      img.alt = name
      img.loading = 'lazy'
      const caption = document.createElement('figcaption')
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.textContent = name
      caption.append(link)
      caption.append(
        document.createTextNode(
          ` · ${(page.blob.size / 1024).toFixed(0)} KB · ${page.width}×${page.height}` +
            (page.clamped ? ' · 降采样' : '')
        )
      )
      card.append(img, caption)
      $('results').append(card)
    }

    const ms = Math.round(performance.now() - started)
    setStatus(`完成：${count} 页，用时 ${ms} ms。`)
    console.table(diagnostics)
    const clamped = diagnostics.filter((d) => d['是否降采样'] === '是')
    if (clamped.length) {
      console.warn(
        `${clamped.length} / ${diagnostics.length} 页被降采样。` +
          `第一页尺寸 ${clamped[0]['页面尺寸(点)']} 点，${clamped[0].DPI} DPI，` +
          `原始 ${clamped[0]['原始像素']}，输出 ${clamped[0]['实际输出']}。`
      )
    }
  } catch (err) {
    if (err instanceof EngineError && err.code === 'CANCELLED') {
      setStatus(`已取消（已产出 ${count} 页，未触发下载）。`)
    } else if (isBrowserLevelFailure(err)) {
      // 第二道防线：pdf.js 或 worker 加载失败，也走同一个提示出口
      const support = detectSupport()
      showUnsupported(support.platform, support.missing)
      setStatus(`浏览器级失败：${describeEngineError(err)}`)
      console.error(err)
    } else {
      setStatus(`失败：${describeEngineError(err)}`)
      console.error(err)
    }
  } finally {
    $('run').disabled = false
    $('cancel').disabled = true
    controller = null
  }
}

// ── 启动 ──
const simulate = new URLSearchParams(location.search).get('simulate')
if (simulate === 'ios' || simulate === 'desktop') {
  showUnsupported(simulate, [{ api: 'Promise.withResolvers' }])
  setStatus('（模拟模式：只展示不支持面板）')
} else {
  const support = detectSupport()
  if (!support.supported) {
    showUnsupported(support.platform, support.missing)
    setStatus('浏览器不支持，未加载 pdf.js。')
  } else {
    setStatus('浏览器检查通过，可以选择文件。')
  }
}

$('run').addEventListener('click', run)
$('cancel').addEventListener('click', () => {
  controller?.abort()
  setStatus('正在取消…')
})
