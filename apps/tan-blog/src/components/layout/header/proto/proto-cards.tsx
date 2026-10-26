// 墨帶＋燈的下拉內容：保留原本卡片的資訊（分類、近期、統計），寫法改成紙上的字。
// 日期寫節氣；這個節氣寫的標題是濕墨、題頭的節氣點朱（DESIGN.md 規則一）。
// 每次打開或換一張，一行一行浮上來。
import type React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { InferClientOutputs } from '@orpc/client'
import { orpc, type client } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { currentContentLocale } from '@/lib/content-locale'
import { SOCIAL_LINKS, getNavLinks, type NavCard } from '@/config/menu'
import { SITE_OWNER } from '@/config/mega-menu'
import { ProtoLink, termOf } from './proto-parts'
import { ActivityLine, OwnerAvatar, type useOwnerActivity } from './owner-mark'

type MenuData = NonNullable<InferClientOutputs<typeof client>['menu']['getMenu']['data']>

const rise = (i: number) => ({ 'data-rise': '', style: { '--i': i } as React.CSSProperties })
const label = 'font-wenkai text-[11px] tracking-[0.3em] text-foreground/40'
const row = 'ink-row flex items-baseline gap-3 py-1.5 outline-none'

/** 一列：節氣 + 標題（乾濕）＋右邊小字 */
function Entry({ href, title, at, aside, onNavigate, i }: { href: string; title: string; at: string; aside?: string; onNavigate?: () => void; i: number }) {
  const t = termOf(at)
  return (
    <ProtoLink href={href} onClick={onNavigate} className={cn(row, 'group/e')} {...rise(i)}>
      <span className={cn('w-8 shrink-0 font-wenkai text-[11px] tracking-wider', t.wet ? 'text-ink' : 'text-foreground/40')}>{t.term}</span>
      <span className={cn('ink-title line-clamp-1 font-wenkai text-[14px] tracking-[0.04em]', `ink-${t.dryness}`, 'group-focus-visible/e:underline decoration-ink/60 underline-offset-4')}>
        {title}
      </span>
      {aside && <span className="ml-auto shrink-0 font-wenkai text-[11px] text-foreground/40">{aside}</span>}
    </ProtoLink>
  )
}

/** 左欄最多列幾個分類／專欄；再多的收成「其他 n 類」，紙的大小才固定 */
const SHELF_LIMIT = 6

type ShelfItem = { key: string; href: string; text: string; count?: number }

/**
 * 左邊固定寬的一欄：一行一個，名字太長就截斷（滑過看全名），數字靠右。
 * 滑過或聚焦的那一行左邊點一點燈。分類再多、名字再長，欄寬與行數都不變。
 */
function Shelf({
  items,
  rest,
  hot,
  onHover,
  onNavigate,
}: {
  items: ShelfItem[]
  rest?: { href: string; text: string }
  hot?: string | null
  onHover?: (key: string | null) => void
  onNavigate?: () => void
}) {
  return (
    <ul className="w-36 shrink-0 border-r border-rule pr-4">
      {items.map((it, i) => {
        const isHot = hot === it.key
        return (
          <li key={it.key} {...rise(i)}>
            <ProtoLink
              href={it.href}
              title={it.text}
              onClick={onNavigate}
              onMouseEnter={() => onHover?.(it.key)}
              onFocus={() => onHover?.(it.key)}
              className={cn(
                'nav-ink relative flex items-baseline gap-2 py-1 pl-3 font-wenkai text-[13px] tracking-[0.1em] outline-none',
                isHot ? 'text-foreground' : 'text-foreground/55'
              )}
            >
              {isHot && <span aria-hidden="true" className="absolute left-0 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-(--lamp)" />}
              <span className="min-w-0 flex-1 truncate">{it.text}</span>
              {it.count != null && <span className="shrink-0 font-mono text-[10px] tracking-normal text-foreground/40">{it.count}</span>}
            </ProtoLink>
          </li>
        )
      })}
      {rest && (
        <li {...rise(items.length)}>
          <ProtoLink href={rest.href} onClick={onNavigate} className={cn('block py-1 pl-3 font-wenkai text-xs tracking-[0.12em] text-foreground/40', footLink)}>
            {rest.text} →
          </ProtoLink>
        </li>
      )}
    </ul>
  )
}

function Foot({ children, i }: { children: React.ReactNode; i: number }) {
  return (
    <div className="mt-3 flex items-center justify-between pt-2 font-wenkai text-xs tracking-[0.14em] text-foreground/50" {...rise(i)}>
      {children}
    </div>
  )
}

const footLink = 'hover:text-foreground focus-visible:text-foreground outline-none focus-visible:underline decoration-ink underline-offset-4'

function PostsCard({ data, onNavigate }: { data: MenuData; onNavigate?: () => void }) {
  const [slug, setSlug] = useState<string | null>(null)
  const cat = slug ? data.categories.find((c) => c.slug === slug) : null
  const posts = (cat ? data.postsByCategory[cat.slug] : data.recentPosts) ?? []
  // 文章最多的前幾類；其餘收進「其他 n 類」（文章頁側欄有完整分類）
  const top = [...data.categories].sort((a, b) => b.postCount - a.postCount).slice(0, SHELF_LIMIT)
  const restCount = data.categories.length - top.length
  return (
    <div className="flex w-[32rem] gap-5 px-6 py-5">
      <Shelf
        items={[
          { key: '', href: '/posts', text: '全部', count: data.postTotal },
          ...top.map((c) => ({ key: c.slug, href: `/categories/${c.slug}`, text: c.name, count: c.postCount })),
        ]}
        rest={restCount > 0 ? { href: '/posts', text: `其他 ${restCount} 類` } : undefined}
        hot={slug ?? ''}
        onHover={(k) => setSlug(k || null)}
        onNavigate={onNavigate}
      />
      <div className="min-w-0 flex-1">
        {/* key：換分類時這幾列重新浮上來 */}
        <div key={slug ?? 'all'}>
          {posts.slice(0, 5).map((p, i) => (
            <Entry key={p.id} href={`/posts/${p.slug}`} title={p.title} at={p.createdAt} onNavigate={onNavigate} i={i + 1} />
          ))}
          {posts.length === 0 && <p className="py-2 font-wenkai text-sm text-foreground/40">還沒有文章</p>}
        </div>
        <Foot i={7}>
          <span className="min-w-0 truncate">{cat ? cat.name : '近期'}</span>
          <ProtoLink href={cat ? `/categories/${cat.slug}` : '/posts'} onClick={onNavigate} className={cn('shrink-0', footLink)}>
            {cat ? `${cat.postCount} 篇` : `共 ${data.postTotal} 篇`} →
          </ProtoLink>
        </Foot>
      </div>
    </div>
  )
}

function NotesCard({ data, onNavigate }: { data: MenuData; onNavigate?: () => void }) {
  const [hot, setHot] = useState<string | null>(null)
  const top = data.topics.slice(0, SHELF_LIMIT)
  const restCount = data.topics.length - top.length
  return (
    <div className={cn('flex gap-5 px-6 py-5', top.length > 0 ? 'w-[30rem]' : 'w-[24rem]')}>
      {top.length > 0 && (
        <div className="shrink-0">
          <p className={cn(label, 'mb-1 pl-3')} {...rise(0)}>專欄</p>
          <Shelf
            items={top.map((t) => ({ key: String(t.id), href: `/notes/topics/${t.slug}`, text: t.name }))}
            rest={restCount > 0 ? { href: '/notes/topics', text: `其他 ${restCount} 個` } : undefined}
            hot={hot}
            onHover={setHot}
            onNavigate={onNavigate}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {data.recentNotes.slice(0, 5).map((n, i) => (
          <Entry key={n.id} href={`/notes/${n.id}`} title={n.title} at={n.createdAt} onNavigate={onNavigate} i={i + 1} />
        ))}
        <Foot i={7}>
          <ProtoLink href="/notes/topics" onClick={onNavigate} className={footLink}>全部專欄</ProtoLink>
          <ProtoLink href="/notes" onClick={onNavigate} className={footLink}>全部手記 →</ProtoLink>
        </Foot>
      </div>
    </div>
  )
}

/** 想法：像隨手寫在紙邊的幾句，用「」框起來 */
function ThinkingCard({ data, onNavigate }: { data: MenuData; onNavigate?: () => void }) {
  return (
    <div className="w-[22rem] px-6 py-5">
      {data.recentThinkings.slice(0, 3).map((t, i) => {
        const term = termOf(t.createdAt)
        return (
          <ProtoLink key={t.id} href="/thinking" onClick={onNavigate} className="ink-row block py-2 outline-none focus-visible:underline decoration-ink/60 underline-offset-4" {...rise(i)}>
            <span className={cn('ink-title line-clamp-2 font-wenkai text-[14px] leading-relaxed tracking-[0.04em]', `ink-${term.dryness}`)}>「{t.content}」</span>
            <span className={cn('mt-0.5 block text-right font-wenkai text-[11px] tracking-wider', term.wet ? 'text-ink' : 'text-foreground/40')}>{term.term}</span>
          </ProtoLink>
        )
      })}
      {data.recentThinkings.length === 0 && <p className="py-2 font-wenkai text-sm text-foreground/40">還沒有想法</p>}
      <Foot i={4}>
        <span />
        <ProtoLink href="/thinking" onClick={onNavigate} className={footLink}>全部想法 →</ProtoLink>
      </Foot>
    </div>
  )
}

const ACTIVITY = { post: '文', note: '記' } as const

function TimelineCard({ data, onNavigate }: { data: MenuData; onNavigate?: () => void }) {
  const children = getNavLinks().find((l) => l.card === 'timeline')?.children ?? []
  return (
    <div className="w-[25rem] px-6 py-5">
      {/* 篩選是設定檔裡固定的三項（手記／文章／專欄），不會變多 */}
      <div className="flex gap-5 whitespace-nowrap" {...rise(0)}>
        {children.map((c) => (
          <ProtoLink key={c.href} href={c.href} onClick={onNavigate} className="nav-ink font-wenkai text-[13px] tracking-[0.12em] text-foreground/55 outline-none">
            {c.text}
          </ProtoLink>
        ))}
      </div>
      <div className="mt-3">
        {data.recentActivity.slice(0, 5).map((a, i) => (
          <Entry key={`${a.type}-${a.id}`} href={a.href} title={a.title} at={a.createdAt} aside={ACTIVITY[a.type]} onNavigate={onNavigate} i={i + 1} />
        ))}
      </div>
    </div>
  )
}

/** 首頁：站主落款＋寫了多少＋社群 */
function HomeCard({ data, activity }: { data: MenuData; activity: ReturnType<typeof useOwnerActivity> }) {
  const stats = [
    { value: data.stats.writingCount, unit: '篇' },
    { value: data.stats.wordCountWan, unit: '萬字' },
    { value: data.stats.days, unit: '日' },
  ]
  return (
    <div className="w-[22rem] px-6 py-5">
      <div className="flex items-center gap-3" {...rise(0)}>
        <OwnerAvatar lit={activity.lit} />
        <div className="min-w-0">
          <p className="font-wenkai text-base tracking-[0.2em]">{SITE_OWNER.name}</p>
          {/* 卡片裡細節直接寫在下面，不垂紙條（紙條會蓋住下面的統計） */}
          <ActivityLine activity={activity} inline />
        </div>
      </div>
      <p className="mt-4 flex items-baseline gap-4 font-wenkai text-foreground/50" {...rise(1)}>
        {stats.map((s) => (
          <span key={s.unit}>
            <span className="text-xl text-foreground">{s.value}</span>
            <span className="ml-1 text-xs tracking-widest">{s.unit}</span>
          </span>
        ))}
      </p>
      <div className="mt-4 flex items-center gap-4" {...rise(2)}>
        {SOCIAL_LINKS.map((s) => (
          <a key={s.link} href={s.link} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="text-foreground/45 outline-none hover:text-ink focus-visible:text-ink">
            <s.icon size={17} stroke={1.5} />
          </a>
        ))}
      </div>
    </div>
  )
}

function MoreCard({ onNavigate }: { onNavigate?: () => void }) {
  const links = getNavLinks().find((l) => l.card === 'more')?.children?.filter((l) => l.show) ?? []
  return (
    <div className="w-48 px-5 py-4">
      {links.map((l, i) => (
        <ProtoLink key={l.href} href={l.href} onClick={onNavigate} className="nav-ink flex items-center gap-3 py-1.5 font-wenkai text-sm tracking-[0.14em] text-foreground/65 outline-none" {...rise(i)}>
          {l.icon && <l.icon size={15} stroke={1.5} className="text-foreground/40" />}
          {l.text}
        </ProtoLink>
      ))}
    </div>
  )
}

export function LampCard({ card, activity, onNavigate }: { card: NavCard; activity: ReturnType<typeof useOwnerActivity>; onNavigate?: () => void }) {
  const { data: res } = useQuery(orpc.menu.getMenu.queryOptions({ input: { locale: currentContentLocale() } }))
  if (card === 'more') return <MoreCard onNavigate={onNavigate} />
  if (!res || res.status !== 'success') {
    return <div className="flex h-32 w-72 items-center justify-center font-wenkai text-sm tracking-[0.3em] text-foreground/35">{res ? '空無一物' : '磨墨中…'}</div>
  }
  const data = res.data
  switch (card) {
    case 'home':
      return <HomeCard data={data} activity={activity} />
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
