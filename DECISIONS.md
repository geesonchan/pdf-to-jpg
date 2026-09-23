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

## 四、pdfjs-dist 标准版 vs legacy 兼容版

| ID | 决策 | 放弃的选项 | 理由 | 反悔成本 |
|---|---|---|---|---|
| D21 | 用 **legacy** 构建（`pdfjs-dist/legacy/build/`） | 标准版 `build/` | 标准版直接调用 `Math.sumPrecise`（16 处，无回退），实际要求 iOS 26.2+ / Chrome 147+ / Firefox 137+；legacy 用 core-js 补上该 API，下限降到 iOS 17.4 / Chrome 119 / Firefox 121。多出的 35.6 KB gzip 换来的是从 iOS 17.4 到 26.1 的全部用户 | **中**：改两处 import 路径 + 重测兼容性 |

### 放弃的用户范围

选 legacy 之后仍然覆盖不到的人：

- **iOS 17.3 及以下**。硬件上限在这条线以下的机型（iPhone X / 8 及更早最高只能到 iOS 16）无论如何都救不回来——它们连 legacy 版也跑不起来。
- **Safari 17.3 及以下的桌面 Mac**，包括停留在 macOS Monterey 的机器。
- **Chrome 118 及以下 / Firefox 120 及以下**。
- 卡住这条线的是 `Promise.withResolvers`（pdf.js 用了 41 处，core-js 未补）。

这些用户看到的是双语「浏览器不支持」提示，不是白屏 —— 提示按平台区分（iOS 只说升级系统，因为 iOS 上所有浏览器都是同一个 WebKit 引擎，换浏览器无效）。

### 重新评估的触发条件

出现以下任一情况，就回到这张表重新算账：

1. **收到「已经是最新版仍看到不支持提示」的反馈**（提示里的 GitHub Issues 链接就是为此准备的）。这说明探测表和真实浏览器脱节了。
2. **升级 pdfjs-dist**。新版本可能改用别的新 API，下限会变 —— 核对步骤见 CLAUDE.md 工作规则第 8 条。
3. **`Promise.withResolvers` 的支持面变成事实上的全覆盖**，那时 legacy 的额外体积就不再值得，可以考虑换回标准版。
4. **体积成为实际问题**（例如要支持慢速网络场景）。

---

## 五、一次数据更正的经过（2026-09-22）

留档，因为这次差点做出错误决策。

**最初的判断（错的）**：我读了 pdf.js 的 `gulpfile.mjs:93`，看到 `ENV_TARGETS` 里写着 `Safari >= 18`，又用 browserslist 解析出最低档位是 `ios_saf 18.5-18.7`，于是得出「标准版最低 iOS 18.4」。基于这个数字，我给出的推荐是**标准版**，理由是「legacy 多花的 35.6 KB 只买到 iOS 17.4–18.3 这一小段用户」。Leo 据此选了标准版。

**怎么发现错的**：准备写「请升级 iOS 到 18.4」这句提示文案时，意识到这个版本号要写死在用户界面里，不能靠推断。于是去核实 `Math.sumPrecise` 的真实支持起点。

**更正后的数据从哪来**：用 MDN 的 `@mdn/browser-compat-data`（装在临时目录，未进项目）直接查。结果是 `Math.sumPrecise` 的支持起点为 **Safari / iOS 26.2、Chrome 147、Firefox 137**，不是 18.4。随后在产物里逐条验证：

| 验证项 | 方法 | 结果 |
|---|---|---|
| 标准版是否真的调用它 | `grep -n sumPrecise build/pdf.mjs build/pdf.worker.mjs` | 16 处，全是调用点 |
| 标准版是否自带 polyfill | `grep -nE "sumPrecise:\s*function\|target: 'Math'"` | 无 |
| legacy 是否补了它 | 同样的 grep | 有，`legacy/build/pdf.worker.mjs:4797` 处 core-js 的 `$({ target: 'Math', stat: true }, { sumPrecise })` |
| legacy 是否补了 `Promise.withResolvers` | 检查所有 `target: 'Promise'` 注册 | 没有，那处注册的是 `Promise.try` |

**教训**：pdf.js 自己声明的 `ENV_TARGETS` 与它实际产出的代码不一致 —— 声明 `Safari >= 18`，实际却调用了需要 Safari 26.2 的 API。**以产物代码为准，不以项目声明为准。** 凡是要写进用户界面的版本号，一律用 MDN 兼容性数据核实，并在产物里验证该 API 有没有 polyfill。

---

## 六、pdfjs-dist 兼容性调研记录（基于 6.3.289 实测，已按第五节更正）

**一个反直觉的事实：legacy 版并不转译语法。** 对比两个产物，私有字段 `#x`（2761 处）、`class`、`async`、箭头函数在两版中**逐字相同**，行号只是被约 6281 行的 core-js 序幕整体下推。legacy 加的是**运行时 API 的 polyfill**，不是语法降级。所以「legacy = 支持老浏览器」这个直觉是错的：它只把**库函数**的下限往下拉，语法下限两版一样。

### 两版的实际浏览器下限

| | 卡住下限的 API | 最低 iOS Safari | 最低 Chrome | 最低 Firefox |
|---|---|---|---|---|
| 标准版 `build/` | `Math.sumPrecise`（16 处调用，无 polyfill） | **26.2** | 147 | 137 |
| legacy `legacy/build/` | `Promise.withResolvers`（41 处调用，core-js 未补） | **17.4** | 119 | 121 |

版本号来自 MDN `@mdn/browser-compat-data`；调用点与 polyfill 的有无由 grep 产物逐条验证（方法见第五节的表）。

> ⚠️ pdf.js 自己的 `ENV_TARGETS`（`gulpfile.mjs:93`）声明 `Safari >= 18`，browserslist 解析出 `ios_saf 18.5-18.7`。**这个声明与它实际产出的代码不符**，不要拿它当依据。

### 体积代价（minify + gzip，主包 + worker 合计）

| | 主包 | worker | 合计 | 相对标准版 |
|---|---|---|---|---|
| 标准版 | 128.1 KB | 364.8 KB | 492.9 KB | — |
| legacy | 147.1 KB | 381.4 KB | **528.5 KB** | **+35.6 KB（+7.2%）** |

另需随产物打包（两版相同）：`cmaps/` 1.6 MB、`standard_fonts/` 816 KB、`wasm/` 1.5 MB、`iccs/` 20 KB。这几项由阶段 3 接入。

> ⚠️ 上述下限是从产物代码与 polyfill 覆盖面推断的，**没有在真实旧设备上验证过**。阶段 3 应找一台 iOS 17 设备或模拟器实测，确认 legacy 版确实能跑。

---

## 七、实现细节（阶段 2 · 界面）

| ID | 决策 | 理由 | 反悔成本 |
|---|---|---|---|
| D22 | 双语文案全部集中到 `src/i18n/dict.js`，删掉阶段 1 的 `i18n/unsupported.js` | KICKOFF 要求「双语文案集中在一个字典文件里」。键为 `分组.键` 两级，`t(lang, path, vars)` 取值。测试守住三件事：中英键集合一致、占位符一一对应、`errors` 覆盖 `engine/errors.js` 的每个错误码 —— 漏翻会红，不靠人工检查 | 低 |
| D23 | 语言偏好存 `localStorage` | 同源存储，不产生任何网络请求，不违反 C1/C4。读写都包 try/catch：Safari 隐私模式下访问 `localStorage` 会抛异常，存不了也不能影响本次使用 | 无 |
| D24 | JSZip 懒加载，且 ZIP 用 `STORE`（不压缩） | 只转一页的用户不该为 ZIP 的 30 KB 付流量；JPG 本身已是压缩格式，再压一遍只增加耗时、几乎不减体积 | 无 |
| D25 | 单页直接下载 JPG，两页及以上才打包 ZIP | KICKOFF §3 的要求。实测：单页给出 `single-page_p1.jpg`，10 页给出 `fifty-pages_jpg.zip` | 无 |
| D26 | 结果缩略图最多显示 12 张 | 每张缩略图占一个 object URL 与一份解码后的位图，50 页全渲染会明显吃内存。ZIP 里仍是全部页面，只是不全部显示 | 无 |
| D27 | DPI 用分段控件三选一，质量用滑块；文本输入框字号固定 16px | 分段控件比下拉框在手机上少一次点击。**16px 是硬性要求**：iOS Safari 遇到小于 16px 的输入框会自动放大整个页面，放大后不会自己还原 | 无 |
| D28 | 引擎与界面之间只传错误码，不传文案 | 引擎可以在没有 DOM、没有语言环境的地方测试；切换语言时错误提示也会跟着变 | 无 |

### 一条值得记住的排错结论

**开发模式下的性能不能用来判断真实性能。** 同样是 10 页转换：

| | 耗时 |
|---|---|
| `npm run dev`（Vite 开发服务器） | 30 秒以上，有时看起来像卡死 |
| `npm run preview`（生产构建） | **406 ms** |

原因：开发模式下 Vite 按原样提供 `pdf.worker.mjs`，带内联 sourcemap 后单次传输约 **9.7 MB**，而且每次打开文档都会重新请求。生产构建里它是一个打包好、可被浏览器缓存的资源。

下次再看到「转换像是卡住了」，先切到 `npm run preview` 复现，再判断是不是真的有问题。

---

## 八、阶段 2 验收后的修订

| ID | 决策 | 理由 | 反悔成本 |
|---|---|---|---|
| D29 | 分享上限**暂定 20 张**，**待真机验证** | iOS 分享面板能一次接受多少文件没有公开文档，只能实测。超过上限时隐藏分享按钮、只留 ZIP，并用一句话说明原因（不静默消失）。阶段 3 在 Leo 的 iPhone 上实测后再定最终值 —— 改 `src/ui/share.js` 的 `SHARE_FILE_LIMIT` 一个常量即可 | 极低 |
| D30 | 画布像素上限固定为 **16,777,216**（4096×4096），**所有平台一视同仁** | 这是 iOS Safari 的单画布面积上限，超过会**静默失败**输出空白图，不报错。桌面浏览器上限更高，但统一用最严的值：一是让同一份 PDF 在手机和电脑上得到相同结果，二是避免"电脑上好好的，手机上白图"这种最难排查的故障。代价是桌面端放弃了一些本可达到的分辨率 | 低（改 `scale.js` 一个常量） |
| D31 | pdf.js 的 `wasm/` 随站点打包，并显式设置 `wasmUrl` | pdf.js 6 用 WebAssembly 解码 JPEG2000 等图像。不指定路径时它按相对位置找，在 `base` 不是 `/` 的站点上会 404，表现为某些页面空白。由 `scripts/copy-pdfjs-assets.js` 在 predev / prebuild 时复制进 `public/pdfjs/`，不引入新依赖（避免走 C3 的审批）。**仍是同源请求，不违反 C1/C4** | 低 |
| D32 | 页面空闲时后台预加载 pdf.js | 首次转换要先下载约 500 KB 的 pdf.js 与 2.4 MB 的 worker；等用户选完文件再下载，这段等待全落在用户眼前。改为空闲时预热后，点「开始转换」时通常已就绪。预加载失败不报错，真正的错误处理仍在转换流程里 | 无 |
| D33 | 缩略图上限保留 12 张，但**必须把没显示的张数说出来**（修订 D26） | D26 只写了"最多显示 12 张"，没考虑到 13 页只看到 12 张缩略图会被当成丢了一页 —— Leo 就是这样报上来的。现在多一句「只显示前 12 张预览，全部 13 张都在 ZIP 里」。`planThumbnails()` 保证 `shown + hidden === total`，有测试守着 | 无 |
| D34 | 新增颜色令牌 `--border-strong`，专供控件边界 | 原来按钮边框用 `--rule`，对比度只有 1.26:1（浅色）/ 1.32:1（深色），远低于 WCAG 1.4.11 对非文字界面组件要求的 3:1 —— 文字看得见，但看不出那是个按钮。新令牌为 `#86867f` / `#707078`，实测 3.54:1 / 3.64:1。`contrast.test.js` 直接解析 `style.css` 的令牌做断言，颜色被改回去就会红 | 无 |

### 关于 CSP（阶段 4 要用）

引入 wasm 后，阶段 4 的 CSP 起点需要加一项：

```
script-src 'self' 'wasm-unsafe-eval'
```

`'wasm-unsafe-eval'` 只允许编译 WebAssembly，**不**恢复 `eval()`，比整体放开 `'unsafe-eval'` 安全得多。`isEvalSupported: false` 仍然保留。

### 第 2 项排查：尚缺文件

Leo 报告一份 13 页中文 PDF 在 iPhone 上「13 页全部降采样」。**`fixtures/manual/` 目前是空的，文件没拿到**，无法给出该文件的确切数字。

已知的边界（由 `computeRenderScale` 实算）：

| 纸张 | 72 DPI | 150 DPI | 300 DPI |
|---|---|---|---|
| A4 595×842 | 否 | 否 | 否（8.7M） |
| Letter 612×792 | 否 | 否 | 否（8.4M） |
| A3 842×1191 | 否 | 否 | **是**（17.4M） |
| A1 1684×2384 | 否 | **是**（17.4M） | 是 |
| A0 2384×3370 | 否 | **是**（34.9M） | 是 |

**普通尺寸的页面在任何一档 DPI 下都不会触发降采样。** 若那份文件是 A4 且用的 150 DPI 却全页降采样，才是 bug。两个可能的非 bug 解释：页面本身就是 A1/A0（工程图、厂商规格书常见），或 PDF 的 `userUnit` 大于 1（CAD 导出常见，pdf.js 会据此放大页面尺寸）。

为了能问出答案，引擎现在每页附带 `source` 诊断数据（页面点尺寸、请求缩放、原始像素、上限），调试页转换结束后会 `console.table` 打印出来。拿到文件后跑一次即可定性。
