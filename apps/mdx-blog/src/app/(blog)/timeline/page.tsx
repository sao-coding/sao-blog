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
        <div className="mt-20">
          <div className="mx-auto mt-14 max-w-5xl px-6">
            <div className="relative pl-[19px] border-l-2">
              <header className="mb-8">
                <h1 className="text-4xl font-bold">
                  時光 {type ? `- ${type}` : ''}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  共 {posts.length} 筆資料
                </p>
              </header>

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
        </div>
      )}
      <BackToTopFAB />
    </>
  )
}

export default TimelinePage