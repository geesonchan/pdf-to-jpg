# PDF → JPG

把 PDF 的每一页转成 JPG 图片。免费、开源、中英双语。
**所有处理都在你的浏览器里完成，文件不会上传到任何服务器。**

线上地址：<https://geesonchan.github.io/pdf-to-jpg/>

> 状态：开发中（阶段 2 · 界面已可用）。核心转换流程已经能用，鲁棒性与隐私加固在阶段 3、4。

## 特性

- 选择或拖入一个 PDF，逐页转成 JPG
- 分辨率 72 / 150 / 300 DPI，JPG 质量 0.5–0.95
- 页码范围，例如 `1-3,5,8-10`
- 单页直接下载，多页打包成 ZIP
- 转换中可随时取消
- 中英双语界面
- 无上传、无统计、无广告、无 CDN

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm test         # 单元测试
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

需要 Node.js ≥ 20.19（本项目在 v24 上开发）。

### 测试样本

真实 PDF 样本请放在 `fixtures/manual/`（该目录已被 `.gitignore` 忽略，永不入库）：

```bash
mkdir -p fixtures/manual
```

## 许可证

[MIT](LICENSE)

---

# PDF → JPG (English)

Turn every page of a PDF into a JPG image. Free, open source, bilingual (中文 / English).
**Everything runs in your browser — your files are never uploaded.**

Live: <https://geesonchan.github.io/pdf-to-jpg/>

> Status: under construction (phase 2 — the UI works). The core conversion flow is usable; robustness and privacy hardening come in phases 3 and 4.

## Features

- Drop in a PDF, get one JPG per page
- 72 / 150 / 300 DPI, JPG quality 0.5–0.95
- Page ranges such as `1-3,5,8-10`
- Single page downloads directly; multiple pages are bundled into a ZIP
- Cancel at any time
- Chinese / English interface
- No uploads, no analytics, no ads, no CDN

## Development

```bash
npm install
npm run dev      # dev server
npm test         # unit tests
npm run build    # build to dist/
npm run preview  # preview the build
```

Requires Node.js ≥ 20.19 (developed on v24).

### Test samples

Put real PDF samples in `fixtures/manual/` — that directory is git-ignored and never committed.

## License

[MIT](LICENSE)
