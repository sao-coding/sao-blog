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

        <div className="relative">
          {/* 基礎線 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-2 left-[18px] w-0.5 bg-neutral-10/15"
          />
          {/* 主題色漸層（覆蓋上方） */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-2 left-[18px] h-[58%] w-0.5 bg-gradient-to-b from-primary to-transparent"
          />

          {recentWriting.map((item, index) => {
            const isFeatured = index === 0
            return (
              <div key={item.id} className="relative py-4 pl-10">
                <span
                  className={`absolute top-4 left-[19px] -translate-x-1/2 bg-stone-900 px-1 text-xs font-medium tracking-[0.5px] tabular-nums ${
                    isFeatured ? 'text-primary' : 'text-neutral-10/40'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                {isFeatured ? (
                  <Link href={item.href} className="group block">
                    <div className="text-xs text-neutral-10/40">
                      {TYPE_LABEL[item.type]} · {fromNow(item.createdAt)}
                      {item.weather &&
                        WEATHER_LABEL[item.weather] &&
                        ` · ${WEATHER_LABEL[item.weather]}`}
                    </div>
                    <div className="mt-2 text-xl leading-normal font-medium text-neutral-10/90 transition-colors group-hover:text-primary">
                      {item.title}
                    </div>
                  </Link>
                ) : (
                  <Link href={item.href} className="group block">
                    <div className="flex items-baseline justify-between gap-5">
                      <span className="text-[15px] text-neutral-10/80 transition-colors group-hover:text-primary">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-xs whitespace-nowrap text-neutral-10/40 tabular-nums">
                        {fromNow(item.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-10/40">
                      {TYPE_LABEL[item.type]}
                      {item.category && ` · ${item.category}`}
                    </div>
                  </Link>
                )}
              </div>
            )
          })}

          {recentWriting.length === 0 && (
            <p className="py-4 pl-10 text-sm text-neutral-10/40">尚無作品</p>
          )}
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
