'use client'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import {
  FolderIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  SquarePenIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react'

interface StatCardsProps {
  counts?: {
    posts: number
    notes: number
    comments: number
    topics: number
    categories: number
    tags: number
  }
  isLoading?: boolean
}

const STAT_ITEMS: {
  key: keyof NonNullable<StatCardsProps['counts']>
  label: string
  icon: LucideIcon
}[] = [
  { key: 'posts', label: '文章', icon: SquarePenIcon },
  { key: 'notes', label: '日記', icon: NotebookPenIcon },
  { key: 'comments', label: '留言', icon: MessageSquareIcon },
  { key: 'topics', label: '專欄', icon: KeyRoundIcon },
  { key: 'categories', label: '分類', icon: FolderIcon },
  { key: 'tags', label: '標籤', icon: TagIcon },
]

export function StatCards({ counts, isLoading }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Icon className="size-4" />
              {label}
            </CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {isLoading || !counts ? '—' : counts[key].toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
