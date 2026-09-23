/**
 * 下载：单页直接给 JPG，多页打包成 ZIP。
 *
 * JSZip 是懒加载的 —— 只转一页的用户不该为 ZIP 的代码付流量。
 */

/** 页数超过这个值时给出提示：ZIP 在内存里构建，页数太多可能吃紧。 */
export const ZIP_PAGE_WARNING = 200

/** 一张图直接下载，多张才打包。 */
export function shouldZip(count) {
  return Number(count) > 1
}

/**
 * 触发浏览器下载。用完立刻释放 object URL。
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Safari 需要等一拍再释放，否则下载会被取消
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 打包成 ZIP。
 * @param {{name: string, blob: Blob}[]} entries
 * @param {(percent:number)=>void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function buildZip(entries, onProgress) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  for (const entry of entries) {
    // JPG 已经是压缩格式，再压一遍只是浪费时间，存储模式即可
    zip.file(entry.name, entry.blob, { compression: 'STORE' })
  }

  return zip.generateAsync({ type: 'blob' }, (meta) => {
    onProgress?.(meta.percent)
  })
}
