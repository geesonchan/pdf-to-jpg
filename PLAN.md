# PLAN.md · 分阶段计划

**规则：每个阶段结束都停下，列出改动、测试结果和待验收的项目。验收通过后才进入下一阶段。**

进度标记：`[ ]` 未开始 · `[~]` 进行中 · `[x]` 已验收

---

## [x] 阶段 0：脚手架

- [x] 项目真相文件：`CLAUDE.md` `PLAN.md` `DECISIONS.md` `HANDOFF.md`
- [x] Vite 项目初始化（原生 JS，无框架）
- [x] MIT `LICENSE`
- [x] 中英 `README.md`
- [x] `.gitignore`（含 `fixtures/manual/`）
- [x] `vite.config.js` 中 `base` = `/pdf-to-jpg/`
- [x] GitHub Actions 流水线：测试 → 构建 → 发布到 GitHub Pages
- [x] 推送到远程仓库，Pages 的 Source 设为 GitHub Actions

**验收**：✅ 已通过（2026-09-22）。线上地址显示占位页，CI & Deploy #1 全绿，网络面板仅 3 个同源请求。

---

## [~] 阶段 1：转换引擎（不做界面）

- [x] `src/engine/convert.js`：输入 ArrayBuffer + 选项，逐页产出 `{ pageNumber, blob }`；AbortSignal 取消
- [x] 纯逻辑拆成独立函数并写单元测试：
  - [x] 页码范围解析 `pageRange.js`（含全角输入归一化）
  - [x] 文件名生成 `filename.js`
  - [x] 像素上限下的缩放比例计算 `scale.js`
- [x] `scripts/make-fixtures.js`：1 页、50 页、横向、A0 超大、无背景（透明）
- [x] 移除 `--passWithNoTests`（D12 到期）
- [x] 依赖锁定精确版本 + 许可证台账 + pdf-lib 仅开发依赖的 CI 守卫
- [x] 选定 pdfjs-dist **legacy** 构建（D21）
- [x] 浏览器支持探测 `support.js` + 双语不支持文案 `i18n/unsupported.js`（按 iOS / 桌面区分，含反馈链接）
- [x] 两道防线：特性探测 + pdf.js/worker 加载异常捕获，统一归到同一个提示出口
- [x] 临时调试页 `debug.html`（仅 dev，不进生产构建）

**验收**：`npm test` 全绿（102 个）；调试页能转出 JPG。

**留到后续阶段**（本阶段不做）：
- 不支持提示接入正式界面 —— 阶段 2（现在只在调试页展示）
- `cmaps/` `standard_fonts/` 复制进产物（中日韩字体）—— 阶段 3
- 真实 iOS 17 设备验证 legacy 版 —— 阶段 3
- 加密 PDF 的密码输入框、ZIP 打包、200 页警告 —— 阶段 2 / 3

---

## [x] 阶段 2：界面（已验收，含验收后的修订）

- [x] 拖放区 + 文件选择按钮（支持键盘操作；拖到页面其它地方不会让浏览器直接打开文件）
- [x] 设置面板：DPI 三选一分段控件、质量滑块、页码范围输入
- [x] 进度条 + 取消按钮
- [x] 下载：单页直接给 JPG，多页打包 ZIP
- [x] 双语文案集中在 `src/i18n/dict.js`（D22），语言可切换并记在 localStorage（D23）
- [x] 不支持提示接入正式界面，两道防线共用同一出口
- [x] 全部错误码都有具体的双语提示，不出现笼统的「出错了」
- [x] 触控目标 ≥ 44px；输入框 16px 防 iOS 自动放大；处理 iPhone 安全区
- [x] iPhone Safari 实测（Leo 2026-09-22 通过：10 页以上转换、中文 PDF、输入框不放大、底部按钮不被遮挡）

**验收**：✅ 已通过。桌面 Chrome 10 页转换 406 ms；iPhone Safari 由 Leo 真机实测通过。

**验收后的修订（已完成）**：
- [x] 提高次要按钮对比度到 WCAG AA（新增 `--border-strong`，D34），并用 `contrast.test.js` 解析 `style.css` 做回归守卫
- [x] 缩略图上限保留但把未显示张数说清楚（D33），`planThumbnails()` 保证 `shown + hidden === total`
- [x] 降采样提示写出实际输出尺寸（例如「输出为 3445×4869 像素」）
- [x] 分享 / 存到相册按钮（D29，上限暂定 20 张待真机验证）
- [x] pdf.js `wasm/` 随站打包并设 `wasmUrl`（D31）
- [x] 页面空闲时后台预加载 pdf.js（D32）
- [x] 画布像素上限的决策记录（D30）

**留到阶段 3**：
- 加密 PDF 的密码输入框（目前捕获到密码异常时给出「暂不支持」的提示，不会崩）
- 超过 200 页的警告
- `cmaps/` `standard_fonts/` 复制进产物（中日韩字体）

---

## [ ] 阶段 3：鲁棒性

实现全部已知技术坑：

| 坑 | 要求 |
|---|---|
| Worker 配置 | 用 Vite 的 `?url` 导入设置 `GlobalWorkerOptions.workerSrc` |
| 中日韩字体 | 把 pdfjs-dist 的 `cmaps/` 和 `standard_fonts/` 复制进构建产物；设置 `cMapUrl`、`cMapPacked: true`、`standardFontDataUrl` |
| 透明背景 | 渲染前先用白色填满画布 |
| iOS Safari 画布上限 | 超过约 1677 万像素（4096×4096）会静默失败；渲染前计算像素数，超限自动降低缩放比例并提示 |
| 内存 | 严格逐页处理：渲染 → 转 Blob → 立即释放（画布宽高置 0、`page.cleanup()`）；任何时刻只持有一张画布 |
| ZIP 内存 | v1 软上限：超过 200 页给出警告；流式 ZIP 记入 backlog |
| 加密 PDF | 捕获 `PasswordException`，弹出密码输入框 |
| 损坏 / 非 PDF | 捕获异常，显示双语友好提示 |
| eval | 调用 PDF.js 时设置 `isEvalSupported: false` |

- 引入 Playwright：自动跑生成的测试 PDF，检查输出数量、文件名、图片尺寸
- **Playwright 网络拦截**：对整个转换过程拦截请求，断言只出现同源地址。这是「无外部请求」的**权威检查**（D17）；CI 里对 HTML/CSS 的 grep 只是早期粗筛（D16），阶段 4 的 CSP 是第三道防线
- 手动样本放 `fixtures/manual/`（由 Leo 提供）：加密 PDF、扫描件、中文 PDF、真实厂商规格书
- **排查那份 13 页中文 PDF 的全页降采样**：拿到文件后用调试页的 `console.table` 诊断，确认页面点尺寸与 userUnit（DECISIONS 第八节）
- **真机实测分享上限**，确定 `SHARE_FILE_LIMIT` 的最终值（D29 目前暂定 20）
- `cmaps/` 与 `standard_fonts/` 加进 `scripts/copy-pdfjs-assets.js` 的资源表（wasm 已在里面）
- **`fixtures/manual/` 不存在或为空时，依赖它的测试自动跳过（skip）而不是失败**。该目录不入库（C6），CI 上永远没有它，不能让它把流水线拖红；跳过时要打印清楚的提示，说明跳过了哪些用例

**验收**：v1.0 验收清单全部通过。

---

## [ ] 阶段 4：隐私加固与发布

- `index.html` 加 CSP 元标签，起点：
  `default-src 'self'; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'`
  （`'wasm-unsafe-eval'` 是 pdf.js 的 wasm 解码器所需，只允许编译 WebAssembly，不恢复 `eval()`；见 D31）
  如果 PDF.js 需要放宽，只做最小修改并记入 `DECISIONS.md`
- 页脚：隐私说明、源码链接、版本号
- 打 tag `v1.0.0`，写复盘文档

**验收**：开发者工具网络面板中，转换全过程无外部请求（与阶段 3 的 Playwright 拦截结果一致）；线上版本号正确。

---

## v1.0 验收清单

- [ ] 1 页 PDF → 直接下载 1 张 JPG
- [ ] 50 页 PDF → ZIP 内 50 张，命名 `xxx_p01` … `xxx_p50`
- [ ] 页码范围 `1-3,5` → 4 张
- [ ] 非法页码范围（`0`、`5-3`、超出总页数）→ 友好提示，不崩溃
- [ ] 透明背景 PDF → 输出白底
- [ ] A0 超大页面 @300 DPI 在 iPhone 上 → 自动降采样并提示，输出不是空白图
- [ ] 中文 PDF → 文字正常显示
- [ ] 加密 PDF → 要求输入密码；输错有提示
- [ ] 非 PDF 文件 / 损坏 PDF → 友好提示
- [ ] 转换中途取消 → 立即停止，不触发下载
- [ ] 转换全过程无外部网络请求
- [ ] 中英切换完整，无漏译
- [ ] 桌面 Chrome、桌面 Safari、iPhone Safari 各通过一次

---

## v1 不做（backlog）

JPG→PDF、合并/拆分、OCR、PDF 转 Word、多文件批量、缩略图预览选页、PWA 离线安装、访问统计、账号、广告、流式 ZIP
