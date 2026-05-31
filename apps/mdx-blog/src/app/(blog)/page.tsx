import { client } from '@/lib/orpc'
import Welcome from './_components/welcome'
import { HomeEditorial } from './_components/home-editorial'
import LocationCard from './_components/location-card'
import SkillsCard from './_components/skills-card'
import { WritingTimelineStrip } from './_components/writing-timeline-strip'
import { HomeFooter } from './_components/home-footer'

export const dynamic = 'force-dynamic'

const HomePage = async () => {
  const res = await client.home.getHome()
  const data = res.data

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

export default HomePage
