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
                <div key={group.year} className="mb-12">
                  <h2 className="text-2xl font-semibold mb-6">{group.year} 年
                    <span className="ml-4 text-sm text-muted-foreground">
                      {group.count} 篇文章
                    </span>
                  </h2>
                  <Timeline articles={group.items} />
                </div>
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