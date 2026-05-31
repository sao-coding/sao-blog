'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { HeartIcon } from 'lucide-react'

interface HomeFooterProps {
  totalLetters: number
}

// 依月份給出當下的時節問候
const SEASONAL_GREETING: Record<number, string> = {
  1: '隆冬時節',
  2: '冬末春初',
  3: '早春微寒',
  4: '春和景明',
  5: '初夏清和',
  6: '仲夏蟬鳴',
  7: '盛夏流光',
  8: '暮夏未央',
  9: '初秋微涼',
  10: '金秋送爽',
  11: '深秋漸寒',
  12: '寒冬將至',
}

export function HomeFooter({ totalLetters }: HomeFooterProps) {
  const greeting = SEASONAL_GREETING[new Date().getMonth() + 1] ?? '四時流轉'

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="mx-auto mt-40 max-w-2xl px-5 pb-24 text-center"
    >
      <h2 className="text-3xl leading-relaxed font-light tracking-[0.15em] text-neutral-10/80">
        {greeting}
        <br />
        歡迎來信
      </h2>

      <div className="mt-12 flex items-stretch justify-center divide-x divide-neutral-10/10">
        <Link href="/notes" className="group px-8">
          <p className="text-sm text-neutral-10/50 transition-colors group-hover:text-primary">
            留下印記
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-lg font-light text-neutral-10/80">
            <HeartIcon className="size-4 fill-primary/70 text-primary/70" />
            {totalLetters.toLocaleString()}
          </p>
        </Link>
        <Link href="/thinking" className="group px-8 text-left">
          <p className="text-sm text-neutral-10/50 transition-colors group-hover:text-primary">
            訂閱通信
          </p>
          <p className="mt-1 text-sm italic text-neutral-10/40">
            不錯過每一紙書。
          </p>
        </Link>
      </div>

      <nav className="mt-16 flex items-center justify-center gap-3 text-sm text-neutral-10/40">
        <Link href="/posts" className="transition-colors hover:text-primary">
          文章
        </Link>
        <span aria-hidden>·</span>
        <Link href="/notes" className="transition-colors hover:text-primary">
          日記
        </Link>
        <span aria-hidden>·</span>
        <Link href="/thinking" className="transition-colors hover:text-primary">
          想法
        </Link>
        <span aria-hidden>·</span>
        <Link href="/timeline" className="transition-colors hover:text-primary">
          時光
        </Link>
      </nav>
    </motion.section>
  )
}
