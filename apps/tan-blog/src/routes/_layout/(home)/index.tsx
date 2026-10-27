import { createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { HOME_TITLE, pageHead, websiteJsonLd } from '@/lib/seo'
import Welcome from './-components/welcome'
import { InkLandscape } from '@/components/ink-landscape'
import { ShojiCalendar } from './-components/shoji-calendar'
import { currentContentLocale } from '@/lib/content-locale'

export const Route = createFileRoute('/_layout/(home)/')({
  loader: async ({ context }) => {
    const res = await context.queryClient.ensureQueryData(
      orpc.home.getHome.queryOptions({ input: { locale: currentContentLocale() } })
    )
    return res
  },
  head: () => ({
    ...pageHead({ title: HOME_TITLE, path: '/' }),
    scripts: [websiteJsonLd()],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: HomePage,
})

function HomePage() {
  const res = Route.useLoaderData()
  const { data } = res

  return (
    <div>
      <div className="relative mt-[-4.5rem] h-dvh">
        <InkLandscape />
        <div className="relative z-40 h-full">
          <Welcome />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl py-16 md:py-24">
        <ShojiCalendar items={data.timeline.items} musings={data.musings} />
      </div>
    </div>
  )
}
