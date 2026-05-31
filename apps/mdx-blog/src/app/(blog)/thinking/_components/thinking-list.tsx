'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'
import { IconLink } from '@tabler/icons-react'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { CommentMarkdownRenderer } from '@/components/comment/comment-markdown-renderer'

dayjs.extend(relativeTime)

type Thinking =
  InferClientOutputs<typeof client>['thinking']['getThinkings']['data'][number]

interface ThinkingListProps {
  items: Thinking[]
}

const EASE = [0.25, 0.1, 0.25, 1] as const

export function ThinkingList({ items }: ThinkingListProps) {
  return (
    <ul className="relative ml-1 space-y-8 border-l-2 border-neutral-10/10">
      {items.map((thinking, index) => (
        <motion.li
          key={thinking.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: index * 0.04 }}
          className="relative pl-6"
        >
          {/* 時間軸圓點 */}
          <span className="absolute top-1.5 -left-[7px] size-3 rounded-full border-2 border-stone-900 bg-teal-400/80" />

          <article className="group rounded-2xl border border-neutral-10/10 bg-white/[0.02] p-5 transition-colors hover:border-neutral-10/20">
            <header className="mb-3 flex items-center gap-3 text-xs text-neutral-10/40">
              <time
                dateTime={dayjs(thinking.createdAt).toISOString()}
                title={dayjs(thinking.createdAt).format('YYYY-MM-DD HH:mm')}
              >
                {dayjs(thinking.createdAt).locale('zh-tw').fromNow()}
              </time>
            </header>

            <div className="prose prose-invert max-w-none prose-p:my-2 text-[15px] leading-relaxed text-neutral-10/80">
              <CommentMarkdownRenderer content={thinking.content} />
            </div>

            {thinking.note && (
              <footer className="mt-4 border-t border-neutral-10/10 pt-3">
                <Link
                  href={`/notes/${thinking.note.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-teal-300/80 transition-colors hover:text-teal-300"
                >
                  <IconLink size={15} />
                  發表於日記：{thinking.note.title}
                </Link>
              </footer>
            )}
          </article>
        </motion.li>
      ))}
    </ul>
  )
}
