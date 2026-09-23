import './style.css'

// 占位页的临时文案。阶段 2 会换成集中的双语字典（src/i18n/）。
const TEXT = {
  zh: {
    tagline: '把 PDF 的每一页转成 JPG 图片。免费，无需注册。',
    privacy: '文件只在你的设备上处理，不会上传。',
    statusTitle: '建设中',
    statusBody: '转换功能正在开发。这个页面用于验证构建与发布流水线。',
    footerPrivacy: '零上传 · 零追踪',
  },
  en: {
    tagline: 'Turn every page of a PDF into a JPG image. Free, no sign-up.',
    privacy: 'Your files are processed on your device and are never uploaded.',
    statusTitle: 'Under construction',
    statusBody: 'The converter is still being built. This page verifies the build and deploy pipeline.',
    footerPrivacy: 'No uploads · No tracking',
  },
}

const lang = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'

for (const el of document.querySelectorAll('[data-i18n]')) {
  el.textContent = TEXT[lang][el.dataset.i18n] ?? ''
}

document.getElementById('version').textContent = `v${__APP_VERSION__}`
