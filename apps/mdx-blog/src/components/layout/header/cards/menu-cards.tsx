'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'
import type { InferClientOutputs } from '@orpc/client'

import { orpc, type client } from '@/lib/orpc'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { NavCard } from '@/config/menu'
import { SOCIAL_LINKS } from '@/config/menu'
import {
  MORE_LINKS,
  PROFILE_PAGE_LINKS,
  SITE_OWNER,
} from '@/config/mega-menu'

dayjs.extend(relativeTime)

type MenuData = NonNullable<
  InferClientOutputs<typeof client>['menu']['getMenu']['data']
>

const fromNow = (iso: string) => dayjs(iso).locale('zh-tw').fromNow()

const useMenuData = () => useQuery(orpc.menu.getMenu.queryOptions())

// --- 共用小元件 ---

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-xs font-medium text-gray-500">{children}</p>
)

const isExternal = (href: string) => /^https?:\/\//.test(href)

const CardLink = ({
  href,
  onNavigate,
  className,
  children,
}: {
  href: string
  onNavigate?: () => void
  className?: string
  children: React.ReactNode
}) => {
  if (isExternal(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  )
}

const Skeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-2 p-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-4 animate-pulse rounded bg-gray-700/50"
        style={{ width: `${70 + ((i * 37) % 30)}%` }}
      />
    ))}
  </div>
)

// --- 各卡片 ---

const HomeCard = ({
  data,
  onNavigate,
}: {
  data: MenuData
  onNavigate?: () => void
}) => {
  const stats = [
    { value: data.stats.writingCount, label: '文' },
    { value: data.stats.wordCountWan, label: '萬字' },
    { value: data.stats.days, label: '日' },
  ]

  return (
    <div className="flex gap-8 p-5">
      {/* 左側：站長資訊 */}
      <div className="flex w-44 shrink-0 flex-col">
        <Avatar className="size-14">
          <AvatarImage src={SITE_OWNER.avatar} />
          <AvatarFallback>{SITE_OWNER.fallback}</AvatarFallback>
        </Avatar>
        <p className="mt-3 text-base font-semibold text-gray-100">
          {SITE_OWNER.name}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
          <span className="size-2 rounded-full bg-green-500" />
          {SITE_OWNER.status}
        </p>

        <div className="mt-4 flex gap-4 border-t border-gray-700/50 pt-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-semibold text-gray-100">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.link}
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 transition-colors hover:text-teal-400"
            >
              <social.icon size={18} />
            </a>
          ))}
        </div>
      </div>

      {/* 右側：頁面 */}
      <div className="min-w-[16rem]">
        <SectionLabel>頁面</SectionLabel>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {PROFILE_PAGE_LINKS.map((link) => (
            <CardLink
              key={link.text}
              href={link.href}
              onNavigate={onNavigate}
              className="rounded-md px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-teal-400"
            >
              {link.text}
            </CardLink>
          ))}
        </div>
      </div>
    </div>
  )
}

const PostsCard = ({
  data,
  onNavigate,
}: {
  data: MenuData
  onNavigate?: () => void
}) => (
  <div className="w-[34rem]">
    <div className="flex gap-6 p-5">
      {/* 分類 */}
      <div className="w-40 shrink-0">
        <SectionLabel>分類</SectionLabel>
        <div className="flex flex-col">
          {data.categories.map((category) => (
            <CardLink
              key={category.slug}
              href={`/categories/${category.slug}`}
              onNavigate={onNavigate}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-teal-400"
            >
              <span>{category.name}</span>
              <span className="text-xs text-gray-500">{category.postCount}</span>
            </CardLink>
          ))}
          {data.categories.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-gray-500">尚無分類</p>
          )}
        </div>
      </div>

      {/* 近期文章 */}
      <div className="flex-1">
        <SectionLabel>近期</SectionLabel>
        <div className="flex flex-col gap-1">
          {data.recentPosts.map((post) => (
            <CardLink
              key={post.id}
              href={`/posts/${post.slug}`}
              onNavigate={onNavigate}
              className="block rounded-md px-2 py-1.5 transition-colors hover:bg-gray-700/50"
            >
              <p className="line-clamp-1 text-sm text-gray-200">{post.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {fromNow(post.createdAt)}
              </p>
            </CardLink>
          ))}
        </div>
      </div>
    </div>

    <CardFooter
      left={{ text: '查看全部文稿', href: '/posts' }}
      right={`${data.postTotal} 篇文稿`}
      onNavigate={onNavigate}
    />
  </div>
)

const NotesCard = ({
  data,
  onNavigate,
}: {
  data: MenuData
  onNavigate?: () => void
}) => (
  <div className="w-[34rem]">
    <div className="flex gap-6 p-5">
      {/* 專欄 */}
      <div className="w-40 shrink-0">
        <SectionLabel>專欄</SectionLabel>
        <div className="flex flex-col">
          {data.topics.map((topic) => (
            <CardLink
              key={topic.id}
              href={`/notes/topics/${topic.slug}`}
              onNavigate={onNavigate}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-teal-400"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: topic.color ?? '#6b7280' }}
              />
              <span className="line-clamp-1">{topic.name}</span>
            </CardLink>
          ))}
          {data.topics.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-gray-500">尚無專欄</p>
          )}
        </div>
      </div>

      {/* 近期手記 */}
      <div className="flex-1">
        <SectionLabel>近期手記</SectionLabel>
        <div className="flex flex-col gap-1">
          {data.recentNotes.map((note) => (
            <CardLink
              key={note.id}
              href={`/notes/${note.id}`}
              onNavigate={onNavigate}
              className="block rounded-md px-2 py-1.5 transition-colors hover:bg-gray-700/50"
            >
              <p className="line-clamp-1 text-sm text-gray-200">{note.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {fromNow(note.createdAt)}
              </p>
            </CardLink>
          ))}
        </div>
      </div>
    </div>

    <CardFooter
      left={{ text: '查看全部手記', href: '/notes' }}
      right={{ text: '全部專欄', href: '/notes/topics' }}
      onNavigate={onNavigate}
    />
  </div>
)

const ThinkingCard = ({
  data,
  onNavigate,
}: {
  data: MenuData
  onNavigate?: () => void
}) => (
  <div className="w-[24rem]">
    <div className="p-5">
      <SectionLabel>近期想法</SectionLabel>
      <div className="flex flex-col gap-1">
        {data.recentThinkings.map((thinking) => (
          <CardLink
            key={thinking.id}
            href="/thinking"
            onNavigate={onNavigate}
            className="block rounded-md px-2 py-1.5 transition-colors hover:bg-gray-700/50"
          >
            <p className="line-clamp-2 text-sm text-gray-200">
              {thinking.content}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {fromNow(thinking.createdAt)}
            </p>
          </CardLink>
        ))}
        {data.recentThinkings.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-gray-500">尚無想法</p>
        )}
      </div>
    </div>

    <CardFooter
      left={{ text: '查看全部想法', href: '/thinking' }}
      onNavigate={onNavigate}
    />
  </div>
)

const TIMELINE_TABS = [
  { text: '手記', href: '/timeline?type=note' },
  { text: '文稿', href: '/timeline?type=post' },
  { text: '回憶', href: '/timeline' },
]

const ACTIVITY_LABEL = { post: '文稿', note: '手記' } as const

const TimelineCard = ({
  data,
  onNavigate,
}: {
  data: MenuData
  onNavigate?: () => void
}) => (
  <div className="w-[24rem]">
    <div className="p-5">
      <div className="flex items-center justify-around gap-2 border-b border-gray-700/50 pb-3">
        {TIMELINE_TABS.map((tab) => (
          <CardLink
            key={tab.text}
            href={tab.href}
            onNavigate={onNavigate}
            className="rounded-md px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-teal-400"
          >
            {tab.text}
          </CardLink>
        ))}
      </div>

      <div className="mt-3">
        <SectionLabel>近期動態</SectionLabel>
        <div className="flex flex-col gap-1">
          {data.recentActivity.map((item) => (
            <CardLink
              key={`${item.type}-${item.id}`}
              href={item.href}
              onNavigate={onNavigate}
              className="flex items-start justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-700/50"
            >
              <span className="min-w-0">
                <span className="line-clamp-1 text-sm text-gray-200">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {fromNow(item.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-gray-500">
                {ACTIVITY_LABEL[item.type]}
              </span>
            </CardLink>
          ))}
        </div>
      </div>
    </div>
  </div>
)

const MoreCard = ({ onNavigate }: { onNavigate?: () => void }) => (
  <div className="w-44 p-2">
    {MORE_LINKS.map((link) => (
      <CardLink
        key={link.text}
        href={link.href}
        onNavigate={onNavigate}
        className="block rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-teal-400"
      >
        {link.text}
      </CardLink>
    ))}
  </div>
)

// 卡片頁尾（左連結 + 右側文字或連結）
const CardFooter = ({
  left,
  right,
  onNavigate,
}: {
  left: { text: string; href: string }
  right?: string | { text: string; href: string }
  onNavigate?: () => void
}) => (
  <div className="flex items-center justify-between border-t border-gray-700/50 px-5 py-3 text-sm">
    <CardLink
      href={left.href}
      onNavigate={onNavigate}
      className="text-gray-300 transition-colors hover:text-teal-400"
    >
      {left.text}
    </CardLink>
    {typeof right === 'string' ? (
      <span className="text-gray-500">{right}</span>
    ) : right ? (
      <CardLink
        href={right.href}
        onNavigate={onNavigate}
        className="text-gray-500 transition-colors hover:text-teal-400"
      >
        {right.text}
      </CardLink>
    ) : null}
  </div>
)

// --- 派發器 ---

const MenuCard = ({
  card,
  onNavigate,
}: {
  card: NavCard
  onNavigate?: () => void
}) => {
  const { data: res, isLoading } = useMenuData()

  // 更多卡片用靜態設定，不需等資料
  if (card === 'more') {
    return <MoreCard onNavigate={onNavigate} />
  }

  if (isLoading || !res || res.status === 'error') {
    return <Skeleton rows={card === 'home' ? 5 : 4} />
  }

  const data = res.data

  switch (card) {
    case 'home':
      return <HomeCard data={data} onNavigate={onNavigate} />
    case 'posts':
      return <PostsCard data={data} onNavigate={onNavigate} />
    case 'notes':
      return <NotesCard data={data} onNavigate={onNavigate} />
    case 'thinking':
      return <ThinkingCard data={data} onNavigate={onNavigate} />
    case 'timeline':
      return <TimelineCard data={data} onNavigate={onNavigate} />
    default:
      return null
  }
}

export default MenuCard
