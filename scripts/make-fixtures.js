/**
 * 生成测试用 PDF。
 *
 * 只在开发时跑：`npm run fixtures`
 * 产物进 fixtures/generated/，该目录已被 .gitignore 忽略（随时可重新生成）。
 *
 * pdf-lib 只是开发工具，绝不进入面向用户的产物 —— CI 有守卫（DECISIONS.md D20）。
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'generated')

// 纸张尺寸（PDF 点，1 点 = 1/72 英寸）
const A4 = [595, 842]
const A4_LANDSCAPE = [842, 595]
const A0 = [2384, 3370]

async function newDoc() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  return { doc, font }
}

/** 画一页可辨认的内容：页码大字 + 标题 + 四角标记（方便肉眼检查有没有裁切）。 */
function drawPage(page, font, { label, pageNumber, totalPages, withBackground = true }) {
  const { width, height } = page.getSize()
  const margin = Math.min(width, height) * 0.04
  const titleSize = Math.min(width, height) * 0.035
  const numberSize = Math.min(width, height) * 0.2

  if (withBackground) {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) })
  }

  page.drawText(`${label} — page ${pageNumber} / ${totalPages}`, {
    x: margin,
    y: height - margin - titleSize,
    size: titleSize,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  const numberText = String(pageNumber)
  page.drawText(numberText, {
    x: (width - font.widthOfTextAtSize(numberText, numberSize)) / 2,
    y: (height - numberSize) / 2,
    size: numberSize,
    font,
    color: rgb(0.15, 0.35, 0.6),
  })

  // 四角标记：渲染若被裁切，一眼就能看出来
  const markSize = margin
  for (const [x, y] of [
    [0, 0],
    [width - markSize, 0],
    [0, height - markSize],
    [width - markSize, height - markSize],
  ]) {
    page.drawRectangle({ x, y, width: markSize, height: markSize, color: rgb(0.8, 0.2, 0.2) })
  }
}

async function buildSimple({ name, label, size, pages, withBackground = true }) {
  const { doc, font } = await newDoc()
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(size)
    drawPage(page, font, { label, pageNumber: i, totalPages: pages, withBackground })
  }
  return { name, bytes: await doc.save() }
}

const FIXTURES = [
  {
    name: 'single-page.pdf',
    build: () => buildSimple({ name: 'single-page.pdf', label: 'Single page', size: A4, pages: 1 }),
    why: '验收：1 页 PDF 应直接下载 1 张 JPG，不打包 ZIP',
  },
  {
    name: 'fifty-pages.pdf',
    build: () => buildSimple({ name: 'fifty-pages.pdf', label: 'Fifty pages', size: A4, pages: 50 }),
    why: '验收：50 页 → ZIP 内 50 张，命名 _p01 … _p50',
  },
  {
    name: 'thirteen-pages.pdf',
    build: () =>
      buildSimple({ name: 'thirteen-pages.pdf', label: 'Thirteen pages', size: A4, pages: 13 }),
    why: '页数跨过缩略图上限（12）的边界，用来守住「缩略图数 / ZIP 条目数 / 提示数字」三者一致',
  },
  {
    name: 'landscape.pdf',
    build: () =>
      buildSimple({ name: 'landscape.pdf', label: 'Landscape', size: A4_LANDSCAPE, pages: 3 }),
    why: '横向页面的宽高不能被弄反',
  },
  {
    name: 'a0-huge.pdf',
    build: () => buildSimple({ name: 'a0-huge.pdf', label: 'A0 huge', size: A0, pages: 2 }),
    why: '验收：A0 @300 DPI 在 iPhone 上应自动降采样，且输出不是空白图',
  },
  {
    name: 'transparent-background.pdf',
    build: () =>
      buildSimple({
        name: 'transparent-background.pdf',
        label: 'Transparent background',
        size: A4,
        pages: 2,
        withBackground: false,
      }),
    why: '验收：无背景的页面转 JPG 必须是白底，不能变黑',
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log(`生成测试 PDF → ${OUT_DIR}\n`)
  for (const fixture of FIXTURES) {
    const { name, bytes } = await fixture.build()
    await writeFile(join(OUT_DIR, name), bytes)
    const kb = (bytes.length / 1024).toFixed(1)
    console.log(`  ✓ ${name.padEnd(30)} ${kb.padStart(8)} KB   ${fixture.why}`)
  }
  console.log(`\n共 ${FIXTURES.length} 个文件。此目录已被 .gitignore 忽略，可随时重新生成。`)
  console.log('注意：加密 PDF、扫描件、中文 PDF 等真实样本放 fixtures/manual/（由 Leo 提供）。')
}

main().catch((err) => {
  console.error('生成失败:', err)
  process.exitCode = 1
})
