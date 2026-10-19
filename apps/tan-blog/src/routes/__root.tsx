import { useEffect } from 'react'
import {
  HeadContent,
  Link,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/theme-provider'
import { getSolarTerm, SEASON_INIT_SCRIPT } from '../lib/season'
import { SeasonParticles } from '../components/season-particles'

import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import appCss from '../styles.css?url'
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/seo'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: SITE_NAME,
      },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
      {
        property: 'og:site_name',
        content: SITE_NAME,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'sitemap',
        type: 'application/xml',
        href: '/sitemap.xml',
      },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: SITE_NAME,
        href: '/rss.xml',
      },
    ],
    scripts: umamiScripts(),
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

// Umami 分析（對應 mdx-blog 的 umami-analytics.tsx）。只在 production build 載入，
// 避免本機開發的瀏覽紀錄灌進正式站的統計。
const UMAMI_ORIGIN = 'https://umami.sao-x.com'
const UMAMI_WEBSITE_ID = '4253ebc1-faea-4497-9376-bd2263a78bb9'

function umamiScripts() {
  if (!import.meta.env.PROD) return []
  return ['script.js', 'recorder.js'].map((file) => ({
    src: `${UMAMI_ORIGIN}/${file}`,
    defer: true,
    'data-website-id': UMAMI_WEBSITE_ID,
  }))
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm tracking-widest text-muted-foreground uppercase">404</p>
      <h1 className="text-3xl font-light">{m.not_found_title()}</h1>
      <Link to="/" className="text-primary underline underline-offset-4">
        {m.not_found_back_home()}
      </Link>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} data-season={getSolarTerm().season} suppressHydrationWarning>
      <head>
        <ScriptOnce>{THEME_INIT_SCRIPT}</ScriptOnce>
        <ScriptOnce>{SEASON_INIT_SCRIPT}</ScriptOnce>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        <ThemeProvider>
          {children}
          <div aria-hidden className="cloud-sea" />
          <SeasonParticles />
          <canvas
            id="universe"
            className="pointer-events-none fixed left-0 top-0 z-[1] m-0 block h-full w-full border-0 p-0 outline-0"
          />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <UniverseScript />
        <Scripts />
      </body>
    </html>
  )
}

// universe.js 直接寫入 canvas 的 width/height 屬性，若以 SSR <script> 標籤載入，
// async 執行時機不保證晚於 hydration，會造成 canvas 屬性的 hydration mismatch。
// 改用 useEffect 注入，確保一定在 hydration 完成後才執行。
function UniverseScript() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/js/universe.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return null
}
