import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { env } from '@sao-blog/env/web'
import Welcome from './_components/welcome'
import { HomeEditorial } from './_components/home-editorial'
import LocationCard from './_components/location-card'
import SkillsCard from './_components/skills-card'
import { WritingTimelineStrip } from './_components/writing-timeline-strip'
import { HomeFooter } from './_components/home-footer'

// 首頁資料對所有訪客相同，改用 ISR（每 60 秒重新驗證）取代每次請求都重算。
// 註：原本透過 orpc client 取數會轉發 next/headers()，使路由被標記為動態而無法快取；
// 這裡改用無 header 的公開 REST 端點 /api/home，讓 Next 的 Data Cache 生效。
export const revalidate = 60

type HomeResponse = InferClientOutputs<typeof client>['home']['getHome']

const HomePage = async () => {
  const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/home`, {
    next: { revalidate: 60 },
  })
  const json = (await res.json()) as HomeResponse
  const data = json.data

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
