import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    nitro({
      // @excalidraw 只在瀏覽器端 useEffect 內動態 import。打包進 server 時，Nitro 會把它與
      // Radix Dialog 共用的依賴（react-remove-scroll 等）合進同一個 chunk，SSR 一載入就執行到
      // 頂層的 `window` 而丟 ReferenceError，所以不打包進 server。
      rollupConfig: { external: [/^@sentry\//, /^@excalidraw\//] },
      // /admin 代理到獨立部署的後台（等同舊 mdx-blog next.config 的 rewrites，網址不變）。
      // admin 的 router basepath / vite base 皆為 /admin，所以目的地保留 /admin 前綴。
      routeRules: {
        '/admin': { proxy: 'https://blog-admin.sao-x.com/admin' },
        '/admin/**': { proxy: 'https://blog-admin.sao-x.com/admin/**' },
      },
    }),
    tailwindcss(),
    tanstackStart({
      // 文章/日記/專欄詳情頁不再走 build-time 靜態清單（新內容不必等重新 build
      // 才看得到）。改成 SSR + src/lib/isr/*.ts 的 Nitro defineCachedFunction
      // 做 ISR：首次請求動態渲染並寫入快取，之後命中快取的效果等同靜態頁，
      // admin 發文/改文/刪文時打 POST /api/revalidate 立即使對應快取失效。
      // 首頁、/posts、/notes、/timeline、/thinking、/login 維持真正 SSR，
      // 不進這裡的 prerender。
      prerender: {
        enabled: false,
      },
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
