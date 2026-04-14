import { orpc } from '@/lib/orpc'

import { BackToTopFAB } from '@/components/fab'
import { Timeline } from './_components/timeline'

const TimelinePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ type?: 'post' | 'note' }>
}) => {
  const { type } = await searchParams

  const data = await orpc.timeline.getTimeLine.call({ type })

  if (!data || data.status === 'error') {
    return <div>Error loading timeline</div>
  }

  const posts = data.data

  return (
    <>
      {posts.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold">
          尚無資料
        </div>
      ) : (
    
          <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
            <header className="mb-12">
                <h1 className="tracking-widest text-neutral-10/50 uppercase mb-3">
                  時間線
                </h1>
                <div className="mb-6 flex items-baseline gap-4">
                  <p className="text-[4.5rem] leading-none font-extralight tracking-tighter text-neutral-10/50">
                    {data?.meta?.total}
                  </p>
                  <span className="text-muted-foreground">
                    篇，再接再厲
                  </span>
                </div>
              </header>
            <div className="relative pl-[19px] border-l-2">
              

              {posts.map((group) => (
                <section key={group.year} className="mb-12">
                  <header className="mb-4 flex items-baseline gap-3">
                    <h2 className="text-5xl leading-none font-extralight tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(115,115,115,0.8)]">
                      <time dateTime={`${group.year}`}>
                        {group.year}
                      </time>
                    </h2>
                    <span className="ml-3 text-sm text-muted-foreground">
                      <span className="sr-only">共有</span>
                      {group.count} 篇文章
                    </span>

                  </header>
                  <Timeline articles={group.items} />
                </section>
              ))}
            </div>
          </div>
    
      )}
      <BackToTopFAB />
    </>
  )
}

export default TimelinePage