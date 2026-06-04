'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@sao-blog/ui/components/avatar'
import { Badge } from '@sao-blog/ui/components/badge'
import dayjs from 'dayjs'

interface RecentUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string | null
  lastOnlineAt: string | null
}

interface RecentUsersListProps {
  data?: RecentUser[]
  isLoading?: boolean
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatLastOnline(isoStr: string | null) {
  if (!isoStr) return '從未登入'
  const date = dayjs(isoStr)
  const now = dayjs()
  const diffMins = now.diff(date, 'minute')
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  const diffHours = now.diff(date, 'hour')
  if (diffHours < 24) return `${diffHours} 小時前`
  const diffDays = now.diff(date, 'day')
  if (diffDays < 30) return `${diffDays} 天前`
  return date.format('YYYY-MM-DD')
}

export function RecentUsersList({ data, isLoading }: RecentUsersListProps) {
  const items = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用者上線紀錄</CardTitle>
        <CardDescription>最近上線的 10 位使用者</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">目前無使用者</p>
        ) : (
          <ul className="space-y-3">
            {items.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={u.image ?? undefined} alt={u.name} />
                  <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{u.name}</span>
                    {u.role && (
                      <Badge variant="outline" className="text-xs">
                        {u.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatLastOnline(u.lastOnlineAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
