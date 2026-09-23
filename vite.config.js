import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// base 必须是仓库名，GitHub Pages 会把站点挂在 /pdf-to-jpg/ 下。
// 本地 dev / preview 也用同一个 base，避免只在线上才暴露的路径问题。
export default defineConfig({
  base: '/pdf-to-jpg/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2022',
    // 所有资源随站点打包，不允许出现外部地址（约束 C4）。
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
