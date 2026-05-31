'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'

dayjs.extend(relativeTime)

type HomeData = InferClientOutputs<typeof client>['home']['getHome']['data']

const WEATHER_LABEL: Record<string, string> = {
  sunny: '晴',
  cloudy: '多雲',
  rainy: '雨',
  snowy: '雪',
  windy: '風',
  stormy: '暴風雨',
}

const TYPE_LABEL = {
  post: '文章',
  note: '筆記',
} as const

const fromNow = (iso: string) => dayjs(iso).locale('zh-tw').fromNow()

const SectionLabel = ({ en, zh }: { en: string; zh: string }) => (
  <header className="mb-6">
    <p className="text-[11px] tracking-[0.3em] text-neutral-10/40 uppercase">
      {en}
    </p>
    <h2 className="mt-1 text-2xl font-light tracking-wide text-neutral-10/80">
      {zh}
    </h2>
  </header>
)

interface HomeEditorialProps {
  recentWriting: HomeData['recentWriting']
  musings: HomeData['musings']
  letters: HomeData['letters']
}

export function HomeEditorial({
  recentWriting,
  musings,
  letters,
}: HomeEditorialProps) {
  const [featured, ...rest] = recentWriting

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-5 lg:grid-cols-2"
    >
      {/* 近期筆墨 */}
      <div>
        <SectionLabel en="Recent Writing" zh="近期筆墨" />

        <div className="relative pl-5">
          {/* 主題色漸層左線 */}
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-gradient-to-b from-primary via-primary/40 to-transparent"
          />

          {featured && (
            <Link href={featured.href} className="group block">
              <p className="mb-2 text-xs text-neutral-10/40">
                <span className="text-primary">01</span>
                <span className="mx-2">{TYPE_LABEL[featured.type]}</span>·
                <span className="mx-2">{fromNow(featured.createdAt)}</span>
                {featured.weather && WEATHER_LABEL[featured.weather] && (
                  <>
                    ·
                    <span className="ml-2">
                      {WEATHER_LABEL[featured.weather]}
                    </span>
                  </>
                )}
              </p>
              <h3 className="text-xl font-medium text-neutral-10/90 transition-colors group-hover:text-primary">
                {featured.title}
              </h3>
            </Link>
          )}

          <ul className="mt-6 space-y-5">
            {rest.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-baseline justify-between gap-4"
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="shrink-0 text-xs text-neutral-10/30 tabular-nums">
                      {String(index + 2).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] text-neutral-10/80 transition-colors group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-10/40">
                        {TYPE_LABEL[item.type]}
                        {item.category && ` · ${item.category}`}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-10/40">
                    {fromNow(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
            {recentWriting.length === 0 && (
              <li className="text-sm text-neutral-10/40">尚無作品</li>
            )}
          </ul>
        </div>
      </div>

      {/* 碎念 + 來信 */}
      <div className="space-y-12">
        <div>
          <SectionLabel en="Musings" zh="碎念" />
          <ul className="space-y-6">
            {musings.map((musing) => (
              <li key={musing.id}>
                <Link
                  href={musing.note ? `/notes/${musing.note.id}` : '/thinking'}
                  className="group block"
                >
                  <p className="line-clamp-2 text-[15px] leading-relaxed text-neutral-10/80 transition-colors group-hover:text-neutral-10">
                    「{musing.content}」
                  </p>
                  <p className="mt-1.5 text-xs text-neutral-10/40">
                    {fromNow(musing.createdAt)}
                    {musing.note && ` · ${musing.note.title}`}
                  </p>
                </Link>
              </li>
            ))}
            {musings.length === 0 && (
              <li className="text-sm text-neutral-10/40">還沒有任何想法</li>
            )}
          </ul>
          <Link
            href="/thinking"
            className="mt-4 inline-block text-xs text-neutral-10/40 transition-colors hover:text-primary"
          >
            更多碎念 →
          </Link>
        </div>

        <div className="border-t border-neutral-10/10 pt-10">
          <SectionLabel en="Letters" zh="來信" />
          <ul className="space-y-6">
            {letters.map((letter) => (
              <li key={letter.id}>
                <blockquote className="border-l border-neutral-10/15 pl-4">
                  <p className="line-clamp-3 text-sm leading-relaxed text-neutral-10/70">
                    {letter.content}
                  </p>
                  <footer className="mt-1.5 text-xs text-neutral-10/40">
                    — {letter.displayUsername}
                  </footer>
                </blockquote>
              </li>
            ))}
            {letters.length === 0 && (
              <li className="text-sm text-neutral-10/40">還沒有任何來信</li>
            )}
          </ul>
        </div>
      </div>
    </motion.section>
  )
}
