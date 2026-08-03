import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { Timeline } from './-components/timeline'
import { ArticlePreviewModal } from '@/components/preview/article-preview-modal'
import ProgressNumber from '@/components/animation/progress-number'

const timelineSearchSchema = z.object({
  type: z.enum(['post', 'note']).optional(),
})

export const Route = createFileRoute('/_layout/timeline/')({
  validateSearch: timelineSearchSchema,
  loaderDeps: ({ search }) => ({ type: search.type }),
  loader: async ({ deps }) => {
    const data = await orpc.timeline.getTimeLine.call({ type: deps.type })
    return data
  },
  head: () => pageHead({
    title: m.page_timeline_title(),
    description: m.page_timeline_description(),
    path: '/timeline',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  }),
  component: TimelinePage,
})

function TimelinePage() {
  const data = Route.useLoaderData()

  if (!data || data.status === 'error') {
    return <div>Error loading timeline</div>
  }

  const posts = data.data

  const now = new Date()

  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const startOfNextYear = new Date(year + 1, 0, 1)

  const dayOfYear =
    Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1

  const totalDays = Math.floor(
    (startOfNextYear.getTime() - startOfYear.getTime()) / 86400000
  )

  const yearProgress = Math.round((dayOfYear / totalDays) * 100)

  const secondsToday =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  const dayProgress = Math.round((secondsToday / 86400) * 100)

  return (
    <>
      {posts.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold">尚無資料</div>
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
              <span className="text-muted-foreground">篇，再接再厲</span>
            </div>
            <div className="flex gap-8">
              <div>
                <ProgressNumber
                  className="text-[2rem] leading-none font-light text-primary"
                  value={dayOfYear}
                />
                <div className="mt-1 text-[11px] text-neutral-10/30">今年第幾天</div>
              </div>
              <div>
                <ProgressNumber
                  className="text-[2rem] leading-none font-light text-neutral-10/50"
                  value={yearProgress}
                />
                <span className="ml-0.5 text-base text-neutral-10/30">%</span>
                <div className="mt-1 text-[11px] text-neutral-10/30">年度進度</div>
              </div>
              <div>
                <ProgressNumber
                  className="text-[2rem] leading-none font-light text-neutral-10/50"
                  value={dayProgress}
                />
                <span className="ml-0.5 text-base text-neutral-10/30">%</span>
                <div className="mt-1 text-[11px] text-neutral-10/30">今日進度</div>
              </div>
              <div></div>
            </div>
          </header>
          <div className="relative ml-1 border-l-2">
            {posts.map((group, index) => (
              <section key={`timeline-${group.year}`} className="mb-12">
                <Timeline
                  year={group.year}
                  count={group.count}
                  groupIndex={index}
                  articles={group.items}
                />
              </section>
            ))}
          </div>
        </div>
      )}
      <BackToTopFAB />
      <Suspense fallback={null}>
        <ArticlePreviewModal />
      </Suspense>
    </>
  )
}
