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
import { Toaster } from '@sao-blog/ui/components/toast'
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/theme-provider'
import { getSolarTerm, seasonInitScript } from '../lib/season'
import { SEASON_ACCENTS, TERM_THEMES } from '../lib/term-themes'

import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import appCss from '../styles.css?url'
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/seo'

import type { QueryClient } from '@tanstack/react-query'

const SEASON_INIT_SCRIPT = seasonInitScript(SEASON_ACCENTS)

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
// fetchpriority=low：統計不影響畫面，不跟 CSS、字體、首屏圖片搶頻寬
const UMAMI_ORIGIN = 'https://umami.sao-x.com'
const UMAMI_WEBSITE_ID = '4253ebc1-faea-4497-9376-bd2263a78bb9'

function umamiScripts() {
  if (!import.meta.env.PROD) return []
  return ['script.js', 'recorder.js'].map((file) => ({
    src: `${UMAMI_ORIGIN}/${file}`,
    defer: true,
    fetchPriority: 'low' as const,
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
  // 依真實節氣寫入季節（底色）、節氣（飄落物）與點綴色；訪客預覽別的季節時由 SEASON_INIT_SCRIPT 覆寫
  const now = getSolarTerm()
  return (
    <html
      lang={getLocale()}
      data-season={now.season}
      data-term={now.index}
      style={{ '--season': TERM_THEMES[now.index].accent } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <ScriptOnce>{THEME_INIT_SCRIPT}</ScriptOnce>
        <ScriptOnce>{SEASON_INIT_SCRIPT}</ScriptOnce>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        <ThemeProvider>
          <Toaster>
            {children}
            <div aria-hidden className="cloud-sea" />
          </Toaster>
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
        <Scripts />
      </body>
    </html>
  )
}
