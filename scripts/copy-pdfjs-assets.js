/**
 * 把 pdfjs-dist 的运行时资源复制进 public/，让它们随站点一起打包。
 *
 * 为什么不用插件：加一个 vite-plugin-static-copy 意味着新增依赖，按约束 C3
 * 要先登记许可证并征得同意。这件事三十行 Node 就能做完，不值得引入依赖。
 *
 * 为什么必须随站带走：约束 C1/C4 不允许运行时去 CDN 取任何东西。
 *
 * 由 package.json 的 predev / prebuild 自动触发，产物目录已写入 .gitignore。
 */

import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FROM = join(ROOT, 'node_modules', 'pdfjs-dist')
const INTO = join(ROOT, 'public', 'pdfjs')

/**
 * 目前只带 wasm/。
 * cmaps/ 与 standard_fonts/（中日韩字体）属于阶段 3，届时加进这张表即可。
 */
const ASSETS = [{ dir: 'wasm', why: 'pdf.js 用 WebAssembly 解码 JPEG2000 等图像' }]

async function directorySize(path) {
  let total = 0
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name)
    total += entry.isDirectory() ? await directorySize(full) : (await stat(full)).size
  }
  return total
}

async function main() {
  await rm(INTO, { recursive: true, force: true })
  await mkdir(INTO, { recursive: true })

  for (const asset of ASSETS) {
    const source = join(FROM, asset.dir)
    await cp(source, join(INTO, asset.dir), { recursive: true })
    const size = await directorySize(join(INTO, asset.dir))
    const files = (await readdir(join(INTO, asset.dir))).length
    console.log(
      `  ✓ ${asset.dir.padEnd(16)} ${String(files).padStart(3)} 个文件  ` +
        `${(size / 1024 / 1024).toFixed(1).padStart(5)} MB   ${asset.why}`
    )
  }
}

main().catch((err) => {
  console.error('复制 pdfjs 资源失败:', err)
  process.exitCode = 1
})
