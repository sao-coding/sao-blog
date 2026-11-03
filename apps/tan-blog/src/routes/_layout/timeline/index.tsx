import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { Timeline } from './-components/timeline'
import ProgressNumber from '@/components/animation/progress-number'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'
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
    return <p className="mt-40 text-center font-display text-ink-3">{m.posts_load_failed()}</p>
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
      <div className={pageShellClass}>
        <ListHeader title={m.page_timeline_title()} titleInNav>
          {m.timeline_total({ count: String(data?.meta?.total ?? 0) })}
        </ListHeader>
        {/* 今天在一年裡的哪裡：數字是濃墨，說明是小字 */}
        <dl data-enter className="-mt-4 mb-14 flex flex-wrap gap-x-10 gap-y-4 font-display">
          <Stat label={m.timeline_day_of_year()}>
            <ProgressNumber className="text-3xl leading-none text-ink-1" value={dayOfYear} />
          </Stat>
          <Stat label={m.timeline_year_progress()}>
            <ProgressNumber className="text-3xl leading-none text-ink-1" value={yearProgress} />
            <span className="ml-0.5 text-base text-ink-3">%</span>
          </Stat>
          <Stat label={m.timeline_day_progress()}>
            <ProgressNumber className="text-3xl leading-none text-ink-1" value={dayProgress} />
            <span className="ml-0.5 text-base text-ink-3">%</span>
          </Stat>
          <Stat label={m.timeline_term()}>
            <TermMark date={now} className="text-3xl leading-none text-zhu" />
          </Stat>
        </dl>

        {posts.length === 0 ? (
          <p className="py-20 text-center font-display text-xl text-ink-3">{m.timeline_empty()}</p>
        ) : (
          posts.map((group) => (
            <section key={group.year} className="mb-14">
              <Timeline year={group.year} count={group.count} articles={group.items} />
            </section>
          ))
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1.5 text-sm text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
