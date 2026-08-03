import { createServerFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { compileMdxSource } from '@/lib/mdx/compile-source'
import { reviveDates } from './revive-dates'

async function fetchAndCompilePostImpl(slug: string) {
  const res = await client.post.getPost({ id: slug })
  if (res.status === 'error' || !res.data) return null
  const mdx = await compileMdxSource(res.data.content, 'full')
  return { ...res.data, ...mdx }
}

// ISR 快取：key 是 slug，不含語系（文章內容跟語系無關，三語共用同一份快取）。
// maxAge 只是 fallback TTL；正常情況下 admin 發文/改文/刪文會直接打
// POST /api/revalidate 呼叫 invalidateCachedPost，不必等這個秒數到期。
// 型別轉換：這個版本的 nitro/cache 型別定義漏標了 runtime 上實際存在的
// `.invalidate()`（見官方文件），用 typeof 原函式 + 補上 invalidate 簽章。
const fetchAndCompilePost = defineCachedFunction(fetchAndCompilePostImpl, {
  name: 'post',
  getKey: (slug: string) => slug,
  maxAge: 60 * 60,
  swr: true,
}) as typeof fetchAndCompilePostImpl & { invalidate: (slug: string) => Promise<void> }

// 包一層 createServerFn：確保這段一定在伺服器執行（client-side navigation 時
// loader 本身跑在瀏覽器，defineCachedFunction 依賴的 nitro/h3 runtime 在瀏覽器
// 不存在），跟既有 compileMdx 的做法一致。
export const getCachedPost = createServerFn({ method: 'GET' })
  .validator(z.string())
  .handler(async ({ data: slug }) => {
    const result = await fetchAndCompilePost(slug)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedPost(slug: string) {
  await fetchAndCompilePost.invalidate(slug)
}
