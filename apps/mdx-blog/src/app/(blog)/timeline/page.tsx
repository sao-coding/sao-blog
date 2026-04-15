import { orpc } from '@/lib/orpc'

import { BackToTopFAB } from '@/components/fab'
import { Timeline } from './_components/timeline'
import ProgressNumber from '@/components/animation/progress-number'

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

  // 日期計算
  const now = new Date()

  // ===== 基礎時間 =====
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const startOfNextYear = new Date(year + 1, 0, 1)

  // ===== 今年第幾天 =====
  const dayOfYear =
    Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1

  // ===== 年度總天數 =====
  const totalDays =
    Math.floor((startOfNextYear.getTime() - startOfYear.getTime()) / 86400000)

  // ===== 年度進度（整數 %）=====
  const yearProgress = Math.round((dayOfYear / totalDays) * 100)

  // ===== 今日已過秒數 =====
  const secondsToday =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds()

  // ===== 今日進度（整數 %）=====
  const dayProgress = Math.round((secondsToday / 86400) * 100)

  return (
    <>
      {posts.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold">
          尚無資料
        </div>
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
              <span className="text-muted-foreground">
                篇，再接再厲
              </span>
            </div>
            <div className="flex gap-8">
              {/* 顯示今年第幾天/年度進度過了幾%/今天過了幾% */}
              <div>
                <ProgressNumber className='text-[2rem] leading-none font-light text-primary' value={dayOfYear} />
                <div className="mt-1 text-[11px] text-neutral-10/30">今年第幾天</div>
              </div>
              <div>
                <ProgressNumber className='text-[2rem] leading-none font-light text-neutral-10/50' value={yearProgress} />
                <span className="ml-0.5 text-base text-neutral-10/30">%</span>
                <div className="mt-1 text-[11px] text-neutral-10/30">年度進度</div>
              </div>
              <div>
                <ProgressNumber className='text-[2rem] leading-none font-light text-neutral-10/50' value={dayProgress}/>
                <span className="ml-0.5 text-base text-neutral-10/30">%</span>
                <div className="mt-1 text-[11px] text-neutral-10/30">今日進度</div>
              </div>
              <div>

              </div>
            </div>
          </header>
          <div className="relative ml-1 border-l-2">


            {posts.map((group, index) => (
              <section key={`${type ?? 'all'}-${group.year}`} className="mb-12">
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
    </>
  )
}

export default TimelinePage