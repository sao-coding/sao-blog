import { createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { pageHead, websiteJsonLd } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import Welcome from './-components/welcome'
import { HomeEditorial } from './-components/home-editorial'
import LocationCard from './-components/location-card'
import SkillsCard from './-components/skills-card'
import { WritingTimelineStrip } from './-components/writing-timeline-strip'
import { HomeFooter } from './-components/home-footer'

export const Route = createFileRoute('/_layout/(home)/')({
  loader: async ({ context }) => {
    const res = await context.queryClient.ensureQueryData(
      orpc.home.getHome.queryOptions()
    )
    return res
  },
  head: () => ({
    ...pageHead({ title: m.page_home_title(), path: '/' }),
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
        <Welcome />
      </div>

      <div className="relative mx-auto w-full max-w-6xl py-12">
        <HomeEditorial
          recentWriting={data.recentWriting}
          musings={data.musings}
          letters={data.letters}
        />

        <section className="mx-auto mt-32 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-5 lg:grid-cols-2">
          <LocationCard />
          <SkillsCard />
        </section>

        <WritingTimelineStrip timeline={data.timeline} />

        <HomeFooter totalLetters={data.stats.totalLetters} />
      </div>
    </div>
  )
}
