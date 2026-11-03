'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import NumberFlow, { NumberFlowGroup, useCanAnimate } from '@number-flow/react'
import { motion, MotionConfig } from 'motion/react'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@sao-blog/ui/components/tooltip'
import { cn } from '@sao-blog/ui/lib/utils'
import {
  ArrowUpIcon,
  ChartColumnBigIcon,
  ChevronRightIcon,
  EyeIcon,
  FolderIcon,
  FolderXIcon,
  HeartIcon,
  MessageSquareIcon,
  MessageSquareWarningIcon,
  MinusIcon,
  NotebookPenIcon,
  SquarePenIcon,
  TagIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

interface Growth {
  thisWeek: number
  lastWeek: number
  today: number
  yesterday: number
}

interface StatCardsProps {
  counts?: {
    posts: number
    notes: number
    comments: number
    topics: number
    categories: number
    tags: number
    uncategorizedPosts: number
    users: number
    pendingComments: number
    postViews: number
    postLikes: number
  }
  growth?: {
    posts: Growth
    notes: Growth
    comments: Growth
    users: Growth
  }
  isLoading?: boolean
}

type GrowthKey = keyof NonNullable<StatCardsProps['growth']>
type CountKey = keyof NonNullable<StatCardsProps['counts']>

const KPI_ITEMS: { key: GrowthKey; label: string; unit: string; icon: LucideIcon; to?: string }[] = [
  { key: 'posts', label: '文章', unit: '篇', icon: SquarePenIcon, to: '/posts' },
  { key: 'notes', label: '日記', unit: '篇', icon: NotebookPenIcon, to: '/notes' },
  { key: 'comments', label: '留言', unit: '則', icon: MessageSquareIcon, to: '/comments' },
  // 沒有使用者管理頁，這張卡不可點
  { key: 'users', label: '使用者', unit: '位', icon: UsersIcon },
]

const MINOR_ITEMS: {
  key: CountKey
  label: string
  icon: LucideIcon
  to?: string
  search?: Record<string, string>
  warnWhenPositive?: boolean
  compact?: boolean
}[] = [
  { key: 'pendingComments', label: '待審留言', icon: MessageSquareWarningIcon, to: '/comments', search: { status: 'pending' }, warnWhenPositive: true },
  { key: 'postViews', label: '文章瀏覽', icon: EyeIcon, compact: true },
  { key: 'postLikes', label: '文章按讚', icon: HeartIcon, compact: true },
  { key: 'topics', label: '專欄', icon: ChartColumnBigIcon, to: '/topics' },
  { key: 'categories', label: '分類', icon: FolderIcon, to: '/categories' },
  { key: 'tags', label: '標籤', icon: TagIcon, to: '/tags' },
  { key: 'uncategorizedPosts', label: '未分類', icon: FolderXIcon, to: '/posts', warnWhenPositive: true },
]

/** 本週 vs 上週的變化比例；上週是 0 時比例沒有意義，回傳 null */
function weekChange(g: Growth): number | null {
  if (g.lastWeek === 0) return g.thisWeek === 0 ? 0 : null
  return (g.thisWeek - g.lastWeek) / g.lastWeek
}

/** 掛載後才把數字設成真正的值，NumberFlow 就會從 0 跳上去 */
function useCountUp(value: number) {
  const [shown, setShown] = useState(0)
  useEffect(() => setShown(value), [value])
  return shown
}

const MotionNumberFlow = motion.create(NumberFlow)
const MotionArrowUp = motion.create(ArrowUpIcon)

/**
 * 成長率膠囊：上升綠、下降紅、持平灰，箭頭會轉向。
 * 做法來自 https://number-flow.barvian.me/examples#motion-for-react ：
 * 用 motion 的 layout 動畫讓膠囊寬度跟著數字變，NumberFlow 本身要 layout + layoutRoot。
 */
function DeltaPill({ ratio, thisWeek }: { ratio: number | null; thisWeek: number }) {
  const canAnimate = useCanAnimate()
  const shown = useCountUp(ratio ?? 0)
  const trend = ratio === null ? 'new' : ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat'

  return (
    <MotionConfig transition={{ layout: canAnimate ? { duration: 0.9, bounce: 0, type: 'spring' } : { duration: 0 } }}>
      <motion.span
        layout
        style={{ borderRadius: 999 }}
        className={cn(
          'inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium tabular-nums transition-colors duration-300',
          trend === 'up' && 'bg-emerald-500/15 text-emerald-400',
          trend === 'down' && 'bg-destructive/15 text-destructive',
          (trend === 'flat' || trend === 'new') && 'bg-muted text-muted-foreground'
        )}
      >
        {trend === 'flat' ? (
          <MinusIcon className="size-3" strokeWidth={3} />
        ) : (
          <MotionArrowUp
            className="size-3"
            strokeWidth={3}
            layout
            initial={false}
            animate={{ rotate: trend === 'down' ? -180 : 0 }}
            transition={{ rotate: canAnimate ? { type: 'spring', duration: 0.5, bounce: 0 } : { duration: 0 } }}
          />
        )}
        {trend === 'new' ? (
          <span>新增 {thisWeek}</span>
        ) : (
          <MotionNumberFlow
            value={Math.abs(shown)}
            format={{ style: 'percent', maximumFractionDigits: 1 }}
            locales="zh-TW"
            style={{ '--number-flow-mask-height': '0.25em' } as CSSProperties}
            layout
            layoutRoot
          />
        )}
      </motion.span>
    </MotionConfig>
  )
}

function KpiCard({
  label,
  unit,
  icon: Icon,
  to,
  total,
  growth,
}: {
  label: string
  unit: string
  icon: LucideIcon
  to?: string
  total: number
  growth: Growth
}) {
  const shownTotal = useCountUp(total)
  const ratio = weekChange(growth)
  const todayDiff = growth.today - growth.yesterday

  const Root = to ? Link : 'div'
  return (
    <Root
      to={to}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card/70 p-4 shadow-sm',
        to && 'transition-colors hover:border-primary/40 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      )}
    >
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          {label}
        </span>
        {to && <ChevronRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-60" />}
      </div>

      {/* NumberFlowGroup：總數與成長率一起變動時動畫同步 */}
      <NumberFlowGroup>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            <NumberFlow value={shownTotal} locales="zh-TW" willChange />
          </span>
          <Tooltip>
            <TooltipTrigger render={<span className="cursor-default" />}>
              <DeltaPill ratio={ratio} thisWeek={growth.thisWeek} />
            </TooltipTrigger>
            <TooltipContent>
              近 7 天新增 {growth.thisWeek} {unit}，前 7 天 {growth.lastWeek} {unit}
            </TooltipContent>
          </Tooltip>
        </div>
      </NumberFlowGroup>

      <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground tabular-nums">
        <span>
          本週 <span className="text-foreground">+{growth.thisWeek}</span>
        </span>
        <span>
          今天 <span className="text-foreground">+{growth.today}</span>
          <span className={cn('ml-1', todayDiff > 0 && 'text-emerald-400', todayDiff < 0 && 'text-destructive')}>
            {todayDiff === 0 ? '同昨天' : `${todayDiff > 0 ? '比昨天多' : '比昨天少'} ${Math.abs(todayDiff)}`}
          </span>
        </span>
      </div>
    </Root>
  )
}

function MinorStat({
  label,
  icon: Icon,
  value,
  to,
  search,
  warn,
  compact,
}: {
  label: string
  icon: LucideIcon
  value: number
  to?: string
  search?: Record<string, string>
  warn?: boolean
  compact?: boolean
}) {
  const shown = useCountUp(value)
  const body = (
    <>
      <Icon className={cn('size-4 text-muted-foreground', warn && 'text-amber-400')} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('ml-auto font-semibold tabular-nums', warn && 'text-amber-400')}>
        <NumberFlow
          value={shown}
          locales="zh-TW"
          // 瀏覽數很大時用「1.2萬」這種寫法
          format={compact ? { notation: 'compact', maximumFractionDigits: 1 } : undefined}
        />
      </span>
    </>
  )
  const className = cn(
    'flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2.5',
    warn && 'border-amber-500/40',
    to && 'transition-colors hover:border-primary/40 hover:bg-card'
  )
  return to ? (
    <Link to={to} search={search} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function StatCards({ counts, growth, isLoading }: StatCardsProps) {
  if (isLoading || !counts || !growth) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_ITEMS.map((i) => (
            <Skeleton key={i.key} className="h-[150px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          {MINOR_ITEMS.map((i) => (
            <Skeleton key={i.key} className="h-[42px] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_ITEMS.map(({ key, ...item }) => (
          <KpiCard key={key} {...item} total={counts[key]} growth={growth[key]} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {MINOR_ITEMS.map(({ key, warnWhenPositive, ...rest }) => (
          <MinorStat key={key} {...rest} value={counts[key]} warn={warnWhenPositive && counts[key] > 0} />
        ))}
      </div>
    </div>
  )
}
