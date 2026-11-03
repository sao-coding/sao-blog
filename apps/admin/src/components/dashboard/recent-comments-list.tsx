'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import { Badge } from '@sao-blog/ui/components/badge'
import { GithubIcon, UserIcon } from 'lucide-react'
import dayjs from 'dayjs'

type CommentSource = 'google' | 'github' | 'credential'
type CommentRefType = 'post' | 'note' | 'page' | 'recently'

interface RecentComment {
  id: string
  displayUsername: string
  content: string
  refType: CommentRefType
  source: CommentSource
  createdAt: string
}

interface RecentCommentsListProps {
  data?: RecentComment[]
  isLoading?: boolean
}

const REF_TYPE_LABELS: Record<CommentRefType, string> = {
  post: '文章',
  note: '日記',
  page: '頁面',
  recently: '最近',
}

function SourceIcon({ source }: { source: CommentSource }) {
  if (source === 'github') return <GithubIcon className="size-4 shrink-0" />
  if (source === 'google') {
    return (
      <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    )
  }
  return <UserIcon className="size-4 shrink-0" />
}

export function RecentCommentsList({ data, isLoading }: RecentCommentsListProps) {
  const items = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>最新留言</CardTitle>
        <CardDescription>最近 5 則留言</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-muted h-14 animate-pulse rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">目前無留言</p>
        ) : (
          <ul className="space-y-3">
            {items.map((comment) => (
              <li
                key={comment.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="text-muted-foreground mt-0.5">
                  <SourceIcon source={comment.source} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.displayUsername}</span>
                    <Badge variant="secondary" className="text-xs">
                      {REF_TYPE_LABELS[comment.refType]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-sm">{comment.content}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
