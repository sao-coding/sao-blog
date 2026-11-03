import type { PlaygroundLang, PlaygroundTemplate } from '@sao-blog/mdx/registry'

export interface PlaygroundFileData {
  name: string
  lang: PlaygroundLang
  code: string
  hidden?: boolean
}

export interface PlaygroundMessage {
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
}

// 版本全部釘死：sandbox 內唯一的外部資源，換版本要手動確認
const REACT_VERSION = '18.3.1'
const BABEL_URL = 'https://unpkg.com/@babel/standalone@7.26.10/babel.min.js'

/** 放進 <script> 內的 JSON：跳脫 `<` 避免原始碼裡的 `</script>` 提早結束標籤 */
const scriptJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c')

// 在 iframe 內執行：把 console / 錯誤轉送給父頁面（父頁面以 event.source + id 驗證來源）
const consoleBridge = (id: string) => `
(function(){
  var ID=${scriptJson(id)};
  function fmt(v){
    if (v instanceof Error) return v.stack || String(v);
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v, null, 2) ?? String(v); } catch (e) { return String(v); }
  }
  function send(level, args){
    try { parent.postMessage({ __playground: ID, level: level, text: Array.prototype.map.call(args, fmt).join(' ') }, '*'); } catch (e) {}
  }
  ['log','info','warn','error'].forEach(function(level){
    var original = console[level];
    console[level] = function(){ send(level, arguments); original.apply(console, arguments); };
  });
  window.addEventListener('error', function(e){ send('error', [e.error || e.message]); });
  window.addEventListener('unhandledrejection', function(e){ send('error', [e.reason]); });
})();`

// 在 iframe 內執行：不打包，逐檔轉成 blob module，import 路徑改寫成
// 本地檔案（./App）→ blob URL、npm 套件 → esm.sh；JSX 用 Babel standalone 轉譯。
const moduleRunner = `
const { files, template, react } = JSON.parse(document.getElementById('__playground_files').textContent);
const byName = new Map(files.map((f) => [f.name, f]));
const urls = new Map();
const building = new Set();

function findLocal(spec, from) {
  const name = spec.replace(/^\\.\\//, '');
  const candidates = [name, name + '.jsx', name + '.js', name + '/index.jsx', name + '/index.js'];
  const hit = candidates.find((c) => byName.has(c));
  if (!hit) throw new Error('找不到 ' + spec + '（在 ' + from + '）');
  return byName.get(hit);
}

function npm(spec) {
  const m = spec.match(/^(@[^/]+\\/[^/@]+|[^/@]+)(@[^/]+)?(\\/.*)?$/);
  if (!m) return 'https://esm.sh/' + spec;
  const [, pkg, version = '', sub = ''] = m;
  // react / react-dom 本身不能帶 ?deps（會變成另一個 build URL → 頁面上出現兩份 React）
  if (pkg === 'react' || pkg === 'react-dom') return 'https://esm.sh/' + pkg + '@' + react + sub;
  return 'https://esm.sh/' + pkg + version + sub + '?deps=react@' + react + ',react-dom@' + react;
}

function resolve(spec, from) {
  if (/^(https?:|data:|blob:)/.test(spec)) return spec;
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const file = findLocal(spec, from);
    // css 已統一注入 <style>，import './styles.css' 換成空模組
    if (file.lang === 'css') return 'data:text/javascript,';
    return build(file);
  }
  return npm(spec);
}

function build(file) {
  if (urls.has(file.name)) return urls.get(file.name);
  if (building.has(file.name)) throw new Error('不支援循環 import：' + file.name);
  building.add(file.name);
  let code = file.code;
  if (file.lang === 'jsx') {
    code = Babel.transform(code, {
      filename: file.name,
      presets: [['react', { runtime: 'automatic' }]],
    }).code;
  }
  code = code.replace(
    /(\\bfrom\\s*|\\bimport\\s*\\(?\\s*)(['"])([^'"\\n]+)\\2/g,
    (_, head, quote, spec) => head + quote + resolve(spec, file.name) + quote
  );
  const url = URL.createObjectURL(new Blob([code + '\\n//# sourceURL=' + file.name], { type: 'text/javascript' }));
  urls.set(file.name, url);
  building.delete(file.name);
  return url;
}

try {
  const scripts = files.filter((f) => f.lang === 'js' || f.lang === 'jsx');
  if (template === 'react') {
    const entry = scripts.find((f) => /^App\\.(jsx?|mjs)$/.test(f.name)) ?? scripts[0];
    const [{ default: App }, { createRoot }, { createElement }] = await Promise.all([
      import(build(entry)),
      import(npm('react-dom/client')),
      import(npm('react')),
    ]);
    if (typeof App !== 'function') throw new Error(entry.name + ' 需要 export default 一個 React 元件');
    createRoot(document.getElementById('root')).render(createElement(App));
  } else {
    for (const file of scripts) await import(build(file));
  }
} catch (err) {
  console.error(err);
}`

/**
 * 組出 sandbox iframe 的 srcdoc。iframe 只給 `allow-scripts`（不含 allow-same-origin），
 * 是 opaque origin：碰不到部落格的 DOM / cookie / localStorage。
 */
export function buildPlaygroundDocument({
  template,
  files,
  theme,
  runId,
}: {
  template: PlaygroundTemplate
  files: PlaygroundFileData[]
  theme: 'light' | 'dark'
  runId: string
}) {
  const html = files.find((f) => f.lang === 'html')?.code
  const css = files.filter((f) => f.lang === 'css').map((f) => f.code)
  const needsBabel = files.some((f) => f.lang === 'jsx')
  const hasScripts = files.some((f) => f.lang === 'js' || f.lang === 'jsx')
  const body = html ?? (template === 'react' ? '<div id="root"></div>' : '')

  return `<!doctype html>
<html class="${theme}" style="color-scheme:${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; }
  body { padding: 12px; font-family: system-ui, sans-serif; background: ${theme === 'dark' ? '#16161d' : '#fff'}; color: ${theme === 'dark' ? '#dcd7ba' : '#1f1f28'}; }
</style>
${css.map((code) => `<style>${code.replace(/<\/style/gi, '<\\/style')}</style>`).join('\n')}
<script>${consoleBridge(runId)}</script>
${needsBabel ? `<script src="${BABEL_URL}"></script>` : ''}
</head>
<body>
${body}
${
  hasScripts
    ? `<script type="application/json" id="__playground_files">${scriptJson({ files, template, react: REACT_VERSION })}</script>
<script type="module">${moduleRunner}</script>`
    : ''
}
</body>
</html>`
}
