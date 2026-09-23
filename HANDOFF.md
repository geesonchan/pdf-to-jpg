# HANDOFF.md · 会话交接

> 每次会话结束更新：完成了什么、卡在哪里、下一步是什么。最新的在最上面。

---

## 2026-09-22 · 阶段 2（界面）

### 完成了什么

- **双语字典集中化**（D22）：新建 `src/i18n/dict.js`，删掉阶段 1 的 `i18n/unsupported.js`。三条自动化守卫：中英键集合一致、占位符一一对应、`errors` 覆盖引擎每一个错误码
- **语言切换**：默认跟随浏览器，可手动切换，记在 localStorage（隐私模式下存不了也不影响使用）
- **完整界面**：拖放区（含键盘操作）、文件卡片、DPI 分段控件、质量滑块、页码范围、进度条、取消、下载、结果缩略图
- **下载**：单页直接给 JPG，多页打包 ZIP（JSZip 懒加载，STORE 模式）
- **不支持提示接入正式页面**，与引擎加载失败共用同一个出口
- **移动端**：触控目标 ≥44px、输入框 16px 防 iOS 自动放大、安全区内边距
- 新增 `src/ui/format.js`、`src/ui/download.js`；测试从 102 增至 **156** 个

### 浏览器实测（Chrome + 生产构建 `npm run preview`）

| 项 | 结果 |
|---|---|
| 10 页转换 | **406 ms**，ZIP 按钮显示「Download ZIP (10 images)」，10 张缩略图 |
| ZIP 内容 | 拦截下载读回校验：10 个条目、`_p01`…`_p10`、JPEG magic bytes 正确、包名 `fifty-pages_jpg.zip` |
| 单页 | 直接下载 `single-page_p1.jpg`，不打包 |
| 语言切换 | html lang、标题、meta 描述、静态与动态文案、页脚、切换按钮 aria-label 全部跟着变，并写入 localStorage |
| 页码范围 0 / 5-3 / 48-99 / abc | 四条都给出**具体**提示，例如「This PDF has 50 pages, so page 99 does not exist.」 |
| 损坏 PDF / 非 PDF 文件 | 各自对应的友好提示 |
| 取消 | 回到设置步骤，结果清空，**未触发任何下载** |
| 运行时网络 | 6 个请求全部同源 + blob，**零外部请求** |
| 移动端 375×812 | 无横向溢出，8 个触控目标全部 ≥44px，中文文件名正常显示 |

### 卡在哪里 / 需要 Leo 做的事

- **iPhone Safari 实测没做成**。本机只有 Xcode 命令行工具，没有完整 Xcode，iOS 模拟器起不来。
  若要我以后能自己验，需要：装 Xcode（App Store 免费），然后运行 `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`（需要密码，我不能代跑）。
  在那之前，阶段 2 验收的「iPhone Safari 一次 10 页转换」需要你在真机上完成。

### 一条排错结论（下次别再被骗）

开发模式的性能不能当真实性能：同样 10 页，`npm run dev` 要 30 秒以上（Vite 每次传输 9.7 MB 的 worker 源文件），`npm run preview` 只要 406 ms。怀疑性能问题时先切生产构建复现。

### 下一步

阶段 3：鲁棒性。加密 PDF 密码框、中日韩字体（cmaps/standard_fonts）、200 页警告、Playwright 自动化 + 网络拦截（「无外部请求」的权威检查）、`fixtures/manual/` 缺失时自动跳过。

---

## 2026-09-22 · 阶段 1（转换引擎）

### 完成了什么

- **依赖**：pdfjs-dist 6.3.289 / jszip 3.10.2 / pdf-lib 1.17.1，全部锁定精确版本（D18）。许可证台账写明 JSZip 是 MIT / GPL-3.0 双许可、本项目取 MIT（D19）。CI 增加 pdf-lib 守卫（D20）
- **选定 legacy 构建**（D21）。过程中发现并更正了一个关键数据错误，经过留档在 DECISIONS.md 第五节
- **纯逻辑模块 + 测试**（102 个用例全绿）：
  - `pageRange.js` 页码范围解析，含中文输入法全角字符归一化
  - `filename.js` 文件名生成与清洗
  - `scale.js` DPI 换算与画布像素上限下的降采样
  - `support.js` 浏览器特性探测（只探测 legacy 没 polyfill 的 API）
  - `i18n/unsupported.js` 双语不支持文案，按 iOS / 桌面区分
- **`convert.js` 引擎**：逐页产出，白底填充，画布即时释放，AbortSignal 取消，pdf.js 异常翻译成错误码
- **`scripts/make-fixtures.js`**：生成 5 个测试 PDF
- **`debug.html`** 临时调试页（仅 dev，不进生产构建）

### 浏览器实测结果（Chrome，开发服务器）

| 项 | 结果 |
|---|---|
| 单页 PDF | `single-page_p1.jpg` 1239×1754（A4@150DPI 正确） |
| 50 页 @150DPI | 50 张，1775 ms，命名 `_p01` … `_p50` 全部两位补零 |
| 页码范围 `1-3,5` | 4 张，命名 `_p01 _p02 _p03 _p05` |
| 透明背景 PDF | 白底输出，棋盘格没透出 |
| A0 @300DPI | 自动降采样到 3445×4869（16,773,705 px ≤ 上限），有内容不空白 |
| 中途取消 | 第 8 / 50 页停住，计数不再增长，按钮复位，未触发下载 |
| 取消后再次转换 | 正常，175 ms 完成 4 页 |
| 不支持面板 | iOS / 桌面两套文案、反馈链接、run 按钮禁用，均正确 |

### 过程中修掉的三个真问题

1. `doc.destroy is not a function` —— pdf.js 的清理入口在 `loadingTask` 上，不在文档对象上
2. 文件名补零用错了基数 —— 用的是「本次选中页数」，应为「文档总页数」。50 页里选 4 页，文件名必须是 `_p01` 不是 `_p1`。引擎现在分别产出 `total`（进度用）和 `totalPages`（命名用）
3. 调试页取样本的 fetch 没带 `base` 前缀导致 404；且该异常发生在 try 之外，变成未捕获的 Promise

### 卡在哪里 / 需要 Leo 决定的事

- 无阻塞项。阶段 1 验收通过后即可进入阶段 2。

### 下一步

阶段 2：界面。要把不支持提示接入正式页面，并建立集中的双语字典（现在只有 `unsupported.js` 一份）。

---

## 2026-09-22 · 阶段 0（脚手架）

### 完成了什么

- 读 `PDF_Convert_KICKOFF.md`，确认仓库名 `pdf-to-jpg`、远程仓库由 Leo 手工创建
- 四个真相文件：`CLAUDE.md`（硬约束 + 工作规则）、`PLAN.md`（五阶段计划 + 验收清单）、`DECISIONS.md`（D1–D15 + 依赖许可证台账）、`HANDOFF.md`（本文件）
- Vite 项目手写初始化（无框架、无模板残留）：`package.json` / `vite.config.js` / `index.html` / `src/main.js` / `src/style.css`
- `base` = `/pdf-to-jpg/`；版本号经 `__APP_VERSION__` 注入，页脚显示
- MIT `LICENSE`；中英双语 `README.md`
- `.gitignore`：`node_modules/` `dist/` `fixtures/manual/` `fixtures/generated/` 等
- GitHub Actions 流水线 `.github/workflows/deploy.yml`：测试 → 构建 → **外部 URL 检查** → 发布到 Pages
- `.claude/launch.json`：dev / preview 两个本地服务配置
- `git init`（分支 main），首次提交

### 本地验证结果

| 项 | 结果 |
|---|---|
| `npm install` | 51 个包，无 GPL/AGPL |
| `npm test` | 通过（阶段 0 暂无测试文件，用 `--passWithNoTests`） |
| `npm run build` | 通过，产物 ~4 KB |
| 产物外部地址扫描 | 干净（只有页脚的 GitHub 源码链接，属白名单） |
| 浏览器实测 `npm run preview` | 占位页正常渲染；网络面板只有 3 个同源请求；版本号显示 v0.1.0；`base` 路径正确 |

### Leo 验收后的修订（同一次提交，已 amend）

1. 提交邮箱改为 `20552271+geesonchan@users.noreply.github.com`（仅本仓库配置），`--reset-author` 重写首个提交，历史中不再出现真实邮箱
2. `LICENSE` 版权人改为 `geesonchan`
3. CI 的外部 URL 检查收窄到 `dist/` 的 HTML 与 CSS，不再扫 JS 产物（D16）；「无外部请求」的权威检查改为阶段 3 的 Playwright 网络拦截（D17），已写进 `PLAN.md` 阶段 3
4. D12 补上到期条件：阶段 1 出现第一个测试文件时移除 `--passWithNoTests`，同时写进 `PLAN.md` 阶段 1
5. `.claude/launch.json` 已核查，**不含本机绝对路径**（只有 `npm run dev/preview` 与端口号），故保留入库
6. `PLAN.md` 阶段 3 补：`fixtures/manual/` 不存在或为空时，相关测试自动跳过而不是失败
7. 已确认 CI 用 `npm ci`（`deploy.yml:33`），`package-lock.json` 已入库

### 发布结果（阶段 0 验收通过）

- 提交 `ef3efa1` 已推送到 `origin/main`
- CI & Deploy 第 1 次运行 conclusion = `success`，`test-and-build` 与 `deploy` 两个 job 均通过（deploy 成功即说明 Pages Source 已是 GitHub Actions）
- 线上 <https://geesonchan.github.io/pdf-to-jpg/> 正常渲染，页脚版本号 v0.1.0
- 浏览器网络面板：仅 3 个请求，全部同源（HTML / JS / CSS），符合 C1/C4

### 踩坑记录

- **不要把文件名列表塞进 shell 变量再不加引号传给命令**。zsh 不对未加引号的参数做分词，同一段脚本在 zsh 与 bash 下行为不同；CI 的外部 URL 检查最初就因此在本地「假绿」（只警告一句就通过）。已改用 `grep -r --include=...`，并用四种场景（正常 / HTML 注入 / CSS 注入 / JS 字符串）实测过报红与忽略行为。

### 下一步

阶段 0 验收通过后 → **阶段 1：转换引擎**。届时会新增依赖 pdfjs-dist（Apache-2.0）、jszip（MIT）、pdf-lib（MIT，仅开发），按 C3 先在 `DECISIONS.md` 登记。
