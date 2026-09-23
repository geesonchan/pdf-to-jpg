# DECISIONS.md · 决策记录

> 大决策（产品 / 架构）由 Leo 定；小的实现细节由 Claude 自行决定并记在这里。
> 新增任何依赖前，必须在这里写明许可证并征得 Leo 同意（约束 C3）。

---

## 一、开工时已定（来自 KICKOFF §7）

| ID | 决策 | 放弃的选项 | 理由 | 反悔成本 |
|---|---|---|---|---|
| D1 | 纯前端处理 | 服务器端转换 | 零成本；隐私可作为卖点；无被滥用风险 | 高（换架构） |
| D2 | Vite + 原生 JS | React；单 HTML 文件 + CDN | 单页工具不需要框架；CDN 违反 C4 | 低 |
| D3 | GitHub Pages | Cloudflare Pages | 已有现成流水线；静态站点迁移几乎零成本，流量大了再迁 | 低 |
| D4 | pdfjs-dist + JSZip | MuPDF.js（AGPL） | 许可证限制 | 中 |
| D5 | v1 只做 PDF→JPG | 一次做全套 PDF 工具 | 先上线，看真实使用再扩展 | — |
| D6 | v1 不加访问统计 | 第三方统计脚本 | 隐私承诺优先；需要时再评估无追踪方案 | 低 |

---

## 二、实现细节（阶段 0）

| ID | 决策 | 理由 | 反悔成本 |
|---|---|---|---|
| D7 | 仓库名 `pdf-to-jpg`，`base` = `/pdf-to-jpg/` | Leo 2026-09-22 确认；线上地址 `geesonchan.github.io/pdf-to-jpg` | 低（改名要同步改 base） |
| D8 | 手写脚手架，不用 `npm create vite` 模板 | 模板会带进 Vite logo、示例计数器等要删的东西；手写文件更少更干净 | 无 |
| D9 | `fixtures/manual/` 整个目录进 `.gitignore`，不放 `.gitkeep` | 严格执行 C6：宁可让目录不入库，也不留「部分忽略」的规则给人改错。目录由 README 说明手动创建 | 无 |
| D10 | 另加 `fixtures/generated/` 到 `.gitignore` | 阶段 1 的测试 PDF 由脚本生成，可随时重建，不必入库 | 无 |
| D11 | 版本号用 Vite `define` 注入 `__APP_VERSION__` | 避免把整个 `package.json` 打进前端包；页脚要显示版本号（阶段 4 要求） | 无 |
| D12 | `npm test` 用 `vitest run --passWithNoTests` | 阶段 0 还没有测试文件，否则流水线会因「找不到测试」而失败。**到期条件：阶段 1 写出第一个测试文件时，立刻从 `package.json` 的 test 脚本里移除 `--passWithNoTests`**，让「没有测试」重新变成红灯 | 无 |
| D16 | CI 的外部 URL 检查只扫 `dist/` 里的 HTML 与 CSS，不扫 JS 产物 | 阶段 1 引入 pdf.js 后，其代码里的命名空间等字符串常量（如 SVG/XML namespace）会被 grep 命中，产生误报，逼着人往白名单里堆例外，反而让这道防线失效。HTML/CSS 是外部资源真正会被声明的地方，保留扫描仍有价值 | 低 |
| D17 | 「无外部请求」的**权威检查**改为阶段 3 的 Playwright 网络拦截 | 静态 grep 只能看字符串，看不到运行时真实发出的请求；拦截浏览器的实际网络活动才是对约束 C1/C4 的真正验证。阶段 4 的 CSP 是第三道防线 | 中（需在阶段 3 落地） |
| D13 | 发布用官方 Pages 流水线（`actions/upload-pages-artifact` + `actions/deploy-pages`） | 不需要 `gh-pages` 分支，产物不入库，权限用 GITHUB_TOKEN 即可 | 低 |
| D14 | 占位页文案暂时内联在 `src/main.js` | 阶段 2 才建集中的双语字典，现在不提前定结构 | 无 |
| D15 | `build.assetsInlineLimit: 0` | 禁止 Vite 把小资源内联成 data URI，保证产物里每个资源都是可审计的同源文件 | 无 |

### 署名（Leo 2026-09-22 确认）

- `LICENSE` 版权人：`Copyright (c) 2026 geesonchan`
- git 提交者：`Leo Chen <20552271+geesonchan@users.noreply.github.com>`，只改本仓库配置（`git config user.email`），未动全局配置（约束 C5）。用 GitHub 的 noreply 邮箱，避免真实邮箱进入公开提交历史。

---

## 三、依赖许可证台账

| 依赖 | 版本 | 许可证 | 用途 | 是否随产物发布 |
|---|---|---|---|---|
| vite | ^7 | MIT | 构建工具 | 否（仅开发） |
| vitest | ^3 | MIT | 单元测试 | 否（仅开发） |

> 阶段 1 起会加入：pdfjs-dist（Apache-2.0，随产物发布）、jszip（MIT，随产物发布）、pdf-lib（MIT，仅开发）。加入时更新本表。
