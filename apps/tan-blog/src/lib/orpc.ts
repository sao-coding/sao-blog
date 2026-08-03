import type { AppRouterClient } from '@sao-blog/api/routers/index'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { env } from '@sao-blog/env/tan-blog'

// client 端：cookie 已隨 credentials: 'include' 自動帶上，不需手動轉發。
// server 端（SSR）：把目前請求的 cookie 轉發給 apps/server，讓 auth session
// 在 SSR/CSR 一致；只轉發 cookie（不轉發整包 request headers），公開資料仍
// 可被下游快取。用 createIsomorphicFn（而非 typeof document 判斷 + 動態
// import）讓 bundler 直接把 .server() 分支連同它的 import 從 client bundle
// 樹搖掉，不會再觸發 import-protection 警告。
const getForwardedHeaders = createIsomorphicFn()
  .client(() => ({}) as Record<string, string>)
  .server(() => {
    const cookie = getRequestHeaders().get('cookie')
    return cookie ? { cookie } : {}
  })

export const link = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: 'include',
    })
  },
  headers: async () => getForwardedHeaders(),
})

export const client: AppRouterClient = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
