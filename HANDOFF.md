# HANDOFF.md · 会话交接

> 每次会话结束更新：完成了什么、卡在哪里、下一步是什么。最新的在最上面。

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

### 卡在哪里 / 需要 Leo 做的事

- 推送后，在仓库 **Settings → Pages → Source 选 "GitHub Actions"**（不是 Deploy from a branch），否则 deploy 步骤会失败。

### 下一步

阶段 0 验收通过后 → **阶段 1：转换引擎**。届时会新增依赖 pdfjs-dist（Apache-2.0）、jszip（MIT）、pdf-lib（MIT，仅开发），按 C3 先在 `DECISIONS.md` 登记。
