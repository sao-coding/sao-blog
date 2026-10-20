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
import { pageShellClass } from '@/components/layout/page-shell'
import { TermMark } from '@/components/written-season'
import { currentContentLocale } from '@/lib/content-locale'

const timelineSearchSchema = z.object({
  type: z.enum(['post', 'note']).optional(),
})

export const Route = createFileRoute('/_layout/timeline/')({
  validateSearch: timelineSearchSchema,
  loaderDeps: ({ search }) => ({ type: search.type }),
  loader: async ({ deps }) => {
    const data = await orpc.timeline.getTimeLine.call({ type: deps.type, locale: currentContentLocale() })
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
        <div className="mt-40 text-center font-wenkai text-xl text-muted-foreground">尚無資料</div>
      ) : (
        <div className={pageShellClass}>
          {/* 標題比照 /posts：文楷大字＋一行小字；數字改成墨色，節氣標出今天 */}
          <header className="mb-12">
            <h1 className="font-wenkai text-4xl text-foreground">時間線</h1>
            <p className="mt-3 flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground">
              共
              <span className="text-2xl leading-none text-ink tabular-nums">{data?.meta?.total}</span>
              篇，再接再厲
            </p>
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 font-wenkai">
              <div>
                <ProgressNumber className="text-3xl leading-none text-ink" value={dayOfYear} />
                <div className="mt-1.5 text-xs text-muted-foreground">今年第幾天</div>
              </div>
              <div>
                <ProgressNumber className="text-3xl leading-none text-foreground/70" value={yearProgress} />
                <span className="ml-0.5 text-base text-muted-foreground">%</span>
                <div className="mt-1.5 text-xs text-muted-foreground">年度進度</div>
              </div>
              <div>
                <ProgressNumber className="text-3xl leading-none text-foreground/70" value={dayProgress} />
                <span className="ml-0.5 text-base text-muted-foreground">%</span>
                <div className="mt-1.5 text-xs text-muted-foreground">今日進度</div>
              </div>
              <div>
                <TermMark date={now} className="text-3xl leading-none" />
                <div className="mt-1.5 text-xs text-muted-foreground">時節</div>
              </div>
            </div>
          </header>
          <div className="relative ml-1 border-l border-rule">
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
