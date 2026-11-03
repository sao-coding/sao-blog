import { topicPublicSchema } from '@sao-blog/api/schema/topic'
import { Link } from '@tanstack/react-router'
import type z from 'zod'
import { m } from '#/paraglide/messages'
import { anchorProps } from '@/lib/page-transition'
import { rowLinkClass } from '@/components/layout/list-parts'

type Topic = z.infer<typeof topicPublicSchema>

interface TopicGridProps {
  topics: Topic[]
}

// 專欄總表：一個專欄一列（名字、介紹、篇數），跟其他列表同一套字，沒有卡片、沒有色點
export function TopicGrid({ topics }: TopicGridProps) {
  return (
    <ul>
      {topics.map((topic) => (
        <li key={topic.id} data-enter className="ink-row relative py-5">
          <h2 className="flex items-baseline gap-3 font-display text-2xl">
            <Link to="/notes/topics/$slug" params={{ slug: topic.slug }} className={`ink-title ${rowLinkClass}`}>
              <span {...anchorProps(`/notes/topics/${topic.slug}`)}>{topic.name}</span>
            </Link>
            <span className="text-sm text-ink-3 tabular-nums">{m.notes_total({ count: String(topic.noteCount) })}</span>
          </h2>
          {topic.introduce && <p className="mt-2 font-display text-ink-2">{topic.introduce}</p>}
          {topic.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-3">{topic.description}</p>}
        </li>
      ))}
    </ul>
  )
}
