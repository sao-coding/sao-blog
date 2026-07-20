import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { ThinkingList } from './_components/thinking-list'

export const revalidate = 60

const ThinkingPage = async () => {
  const data = await client.thinking.getThinkings().catch((err) => {
    console.error('Failed to fetch thinkings:', err)
    return null
  })

  const thinkings = data?.data ?? []
  const total = data?.meta?.total ?? thinkings.length

  return (
    <>
      <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <header className="mb-12">
          <h1 className="mb-3 tracking-widest text-neutral-10/50 uppercase">
            想法
          </h1>
          <div className="mb-6 flex items-baseline gap-4">
            <p className="text-[4.5rem] leading-none font-extralight tracking-tighter text-neutral-10/50">
              {total}
            </p>
            <span className="text-muted-foreground">則隨手記下的心情</span>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-neutral-10/40">
            這裡是一些零碎的念頭與當下的心情，不一定完整，也不一定深刻，
            只是想說說而已。
          </p>
        </header>

        {thinkings.length === 0 ? (
          <div className="mt-20 text-center text-2xl font-semibold text-neutral-10/50">
            還沒有任何想法
          </div>
        ) : (
          <ThinkingList items={thinkings} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}

export default ThinkingPage
