import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { compileMdxSource } from './compile-source'

// 只會在伺服器端執行（即使 loader 在 client-side navigation 重新執行，
// createServerFn 呼叫也一定是打去伺服器的 RPC，不會在瀏覽器內跑一次
// 這整套很重的 compile 流程）。
//
// method 必須是 POST：payload 帶著整篇文章的原始 MDX 內容，用 GET 的話
// createServerFn 會把 data 序列化進查詢字串，長文章一定爆掉 URL 長度上限
//（client-side navigation 時 loader 重新執行、真的會打這支 RPC，才會踩到；
// SSR 首次載入時 loader 在伺服器端直接呼叫，不經過 HTTP，掩蓋了這個問題）。
export const compileMdx = createServerFn({ method: 'POST' })
  .validator(z.object({ source: z.string(), variant: z.enum(['full', 'basic']) }))
  .handler(async ({ data }) => {
    return compileMdxSource(data.source, data.variant)
  })
