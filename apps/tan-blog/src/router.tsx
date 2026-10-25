import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '#/paraglide/runtime'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { RouteError } from './components/route-error'
import { getContext } from './components/providers/query-context'
import { installTransitionInterruptGuard, postTransitionTypes, supportsPostTransitions } from './lib/post-transitions'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    // 單一路由的 loader / render 出錯時，只替換該路由的內容，header、footer 照常顯示
    defaultErrorComponent: RouteError,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // 文章列表 ⇄ 文章的展卷／收卷、文章之間翻頁（見 lib/post-transitions.ts）
    defaultViewTransition: supportsPostTransitions() ? { types: postTransitionTypes } : false,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
  if (supportsPostTransitions()) installTransitionInterruptGuard()

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
