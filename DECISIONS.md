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

| D18 | 三个新依赖锁定**精确版本号**（不用 `^` / `~`） | pdf.js 的小版本会悄悄抬高浏览器基线——实测 6.3.289 的标准版直接调用 `Math.sumPrecise`、依赖 `Iterator` 全局，这类变化不会体现在版本号语义里。锁死后由人工升级并重跑兼容性测试，不让 `npm i` 在无人察觉时改变支持范围 | 低 |
| D19 | JSZip 选用 **MIT** | JSZip 是 MIT / GPL-3.0-or-later **双许可**（`package.json` 里写作 `(MIT OR GPL-3.0-or-later)`）。本项目按约束 C3 选用 MIT 一侧，GPL 一侧不适用 | 无 |
| D20 | pdf-lib 只进 `devDependencies`，并由 CI 守卫 | 它只用于 `scripts/make-fixtures.js` 生成测试 PDF，绝不能进入面向用户的产物。CI 增加一步检查：① `package.json` 里 pdf-lib 必须在 devDependencies 且不在 dependencies；② `src/` 与 `index.html` 不得 import 它；③ `dist/` 里不得出现它的痕迹 | 无 |

### 署名（Leo 2026-09-22 确认）

- `LICENSE` 版权人：`Copyright (c) 2026 geesonchan`
- git 提交者：`Leo Chen <20552271+geesonchan@users.noreply.github.com>`，只改本仓库配置（`git config user.email`），未动全局配置（约束 C5）。用 GitHub 的 noreply 邮箱，避免真实邮箱进入公开提交历史。

---

## 三、依赖许可证台账

版本全部锁死（D18）。白名单：MIT / Apache-2.0 / BSD / ISC（约束 C3）。

| 依赖 | 锁定版本 | 许可证 | 用途 | 随产物发布 |
|---|---|---|---|---|
| pdfjs-dist | `6.3.289` | Apache-2.0 | 解析与渲染 PDF 页面 | **是** |
| jszip | `3.10.2` | **MIT / GPL-3.0-or-later 双许可，本项目选用 MIT** | 多页打包成 ZIP | **是** |
| pdf-lib | `1.17.1` | MIT | 生成测试用 PDF（`scripts/make-fixtures.js`） | 否（仅开发，CI 守卫，见 D20） |
| vite | `^7.1.5` | MIT | 构建工具 | 否（仅开发） |
| vitest | `^3.2.4` | MIT | 单元测试 | 否（仅开发） |

> vite / vitest 仍用 `^`：它们不进产物，也不影响浏览器兼容性基线，浮动升级的收益（安全修复）大于风险。进产物的依赖一律锁死。

---

## 四、pdfjs-dist 标准版 vs legacy 兼容版（待 Leo 决定）

调研结论见下方「阶段 1 调研记录」。选定后在此补写 D21。

### 阶段 1 调研记录（2026-09-22，基于 pdfjs-dist 6.3.289 实测）

**一个反直觉的事实：legacy 版并不转译语法。** 对比两个产物，私有字段 `#x`（2761 处）、`class`、`async`、箭头函数在两版中**逐字相同**，行号只是被约 6281 行的 core-js 序幕整体下推。legacy 加的是**运行时 API 的 polyfill**，不是语法降级。

用 pdf.js 自己的 `ENV_TARGETS`（`gulpfile.mjs:93`）解析 browserslist，最低档位是：

```
ios_saf 18.5-18.7 / safari 18.0
```

两版实际的浏览器下限：

| | 卡住下限的原因 | 实际最低 iOS Safari |
|---|---|---|
| 标准版 `build/` | 直接调用 `Math.sumPrecise`（6 处真实用法）、假定 `Iterator` 全局存在，均无回退 | **18.4** |
| legacy 版 `legacy/build/` | core-js 补上了 Iterator helpers 与 `Math.sumPrecise`；但**没有**补 `Promise.withResolvers`（代码里 41 处、无回退） | **17.4** |

体积代价（minify + gzip，主包 + worker 合计）：

| | 主包 | worker | 合计 | 相对标准版 |
|---|---|---|---|---|
| 标准版 | 128.1 KB | 364.8 KB | **492.9 KB** | — |
| legacy | 147.1 KB | 381.4 KB | **528.5 KB** | **+35.6 KB（+7.2%）** |

另需随产物打包（两版相同）：`cmaps/` 1.6 MB、`standard_fonts/` 816 KB、`wasm/` 1.5 MB、`iccs/` 20 KB。

**关键判断：legacy 多花的 35.6 KB 只买到 iOS 17.4–18.3 这一段用户。** 真正的老设备一个也救不到——iPhone X / 8 及更早机型最高停在 iOS 16，两个版本都跑不起来。而 17.4–18.3 的用户是「能升级但没升」，不是「升不动」。

反过来，桌面端有一段不同的账：macOS Monterey 的 Safari 停在 17.x，那些 Mac 本身无法升级系统。这部分用户只有 legacy 版能覆盖。

> ⚠️ 上述下限是从产物代码与 polyfill 覆盖面推断的，**没有在真实旧设备上验证过**。若选 legacy，阶段 3 应找一台 iOS 17 设备或模拟器实测；若选标准版，则需要一个明确的「浏览器不支持」提示路径。
