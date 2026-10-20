import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { resolveCompiled } from '@/lib/mdx/compile-source'
import { CONTENT_LOCALES, type ContentLocale } from '@/lib/content-locale'
import { localeSchema } from '@sao-blog/api/schema/i18n'
import { reviveDates } from './revive-dates'

async function fetchAndCompilePostImpl(slug: string, locale: ContentLocale) {
  const res = await client.post.getPost({ id: slug, locale })
  if (res.status === 'error' || !res.data) return null
  const mdx = await resolveCompiled(res.data, 'full')
  return { ...res.data, ...mdx }
}

// ISR 快取：key 是「語系:slug」，各語言版本分開快取（無譯文時該語系快取的是原文 fallback）。
// maxAge 只是 fallback TTL；正常情況下 admin 發文/改文/刪文會直接打
// POST /api/revalidate 呼叫 invalidateCachedPost，不必等這個秒數到期。
// 型別轉換：這個版本的 nitro/cache 型別定義漏標了 runtime 上實際存在的
// `.invalidate()`（見官方文件），用 typeof 原函式 + 補上 invalidate 簽章。
type CachedPostFn = typeof fetchAndCompilePostImpl & {
  invalidate: (slug: string, locale: ContentLocale) => Promise<void>
}

// createServerOnlyFn：client bundle 會連同 nitro/cache 的 import 一起移除，
// 避免 module top-level 呼叫 defineCachedFunction 讓瀏覽器載入 Nitro runtime（會噴 stub 警告）。
let cachedPost: CachedPostFn | undefined
const getFetchAndCompilePost = createServerOnlyFn(() => {
  cachedPost ??= defineCachedFunction(fetchAndCompilePostImpl, {
    name: 'post',
    getKey: (slug: string, locale: ContentLocale) => `${locale}:${slug}`,
    maxAge: 60 * 60,
    swr: true,
  }) as CachedPostFn
  return cachedPost
})

// 包一層 createServerFn：確保這段一定在伺服器執行（client-side navigation 時
// loader 本身跑在瀏覽器，defineCachedFunction 依賴的 nitro/h3 runtime 在瀏覽器
// 不存在），跟既有 compileMdx 的做法一致。
export const getCachedPost = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string(), locale: localeSchema }))
  .handler(async ({ data: { slug, locale } }) => {
    const result = await getFetchAndCompilePost()(slug, locale)
    return result ? reviveDates(result) : null
  })

// 任何語言版本變動都清掉該文章所有語系的快取（fallback 頁也可能因此改變）
export async function invalidateCachedPost(slug: string) {
  await Promise.all(CONTENT_LOCALES.map((locale) => getFetchAndCompilePost().invalidate(slug, locale)))
}
