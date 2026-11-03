import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { ThinkingList } from './-components/thinking-list'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'

export const Route = createFileRoute('/_layout/thinking/')({
  loader: async () => {
    const data = await client.thinking.getThinkings().catch((err) => {
      console.error('Failed to fetch thinkings:', err)
      return null
    })
    return data
  },
  head: () => pageHead({
    title: m.page_thinking_title(),
    description: m.page_thinking_description(),
    path: '/thinking',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  }),
  component: ThinkingPage,
})

function ThinkingPage() {
  const data = Route.useLoaderData()
  const thinkings = data?.data ?? []
  const total = data?.meta?.total ?? thinkings.length

  return (
    <>
      <div className={pageShellClass}>
        <ListHeader title={m.page_thinking_title()} titleInNav>
          <p className="max-w-xl">
            <span className="mr-1.5 tabular-nums">{total}</span>
            {m.thinking_count()}
            <br />
            {m.thinking_intro()}
          </p>
        </ListHeader>

        {thinkings.length === 0 ? (
          <p className="mt-20 text-center font-display text-xl text-ink-3">{m.thinking_empty()}</p>
        ) : (
          <ThinkingList items={thinkings} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
