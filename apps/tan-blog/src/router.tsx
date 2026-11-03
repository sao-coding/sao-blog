import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '#/paraglide/runtime'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { RouteError } from './components/route-error'
import { getContext } from './components/providers/query-context'
import { installPageTransitions, supportsViewTransitionTypes, viewTransitionTypes } from './lib/page-transition'

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
    // 換頁的墨洇：舊頁暈開、新頁收乾，方向照深度與 nav 順序（見 lib/page-transition.ts）
    defaultViewTransition: supportsViewTransitionTypes() ? { types: viewTransitionTypes } : false,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
  if (typeof window !== 'undefined') installPageTransitions()

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
