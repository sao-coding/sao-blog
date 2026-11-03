// 導覽的資料：各區照 nav 順序（也就是換頁的方向），標出目前所在。
// 子項目放在選單的第二欄：文章的分類、日記底下的專欄（專欄是一組一組的日記，併進日記）、友鏈底下的朋友圈。
// 分類、專欄多了也不會撐爆選單：只列前 CHILD_LIMIT 個（篇數多的在前），其餘收成最後一行「其他 N 類 →」「全部專欄 →」。
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { m } from '#/paraglide/messages'
import { orpc } from '@/lib/orpc'
import { currentContentLocale } from '@/lib/content-locale'
import { setNavChildOrder } from '@/lib/page-transition'

/** more：收尾那一行（看全部），樣式淡一點、帶箭頭 */
export type PlaceChild = { href: string; text: string; count?: number; active: boolean; more?: boolean }
export type Place = { key: string; text: string; href: string; active: boolean; children: PlaceChild[] }

export const CHILD_LIMIT = 6

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

export function usePlaces(): Place[] {
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data } = useQuery(orpc.menu.getMenu.queryOptions({ input: { locale: currentContentLocale() } }))
  const menu = data?.status === 'success' ? data.data : null
  const categories = [...(menu?.categories ?? [])].filter((c) => c.postCount > 0).sort((a, b) => b.postCount - a.postCount)
  const topics = menu?.topics ?? []

  const shownCats = categories.slice(0, CHILD_LIMIT)
  const restCats = categories.length - shownCats.length
  // 正在看的分類就算排在後面，也要留在選單裡
  const hereCat = categories.find((c) => under(pathname, `/categories/${c.slug}`))
  if (hereCat && !shownCats.includes(hereCat)) shownCats[shownCats.length - 1] = hereCat

  const shownTopics = topics.slice(0, CHILD_LIMIT)
  const hereTopic = topics.find((t) => under(pathname, `/notes/topics/${t.slug}`))
  if (hereTopic && !shownTopics.includes(hereTopic)) shownTopics[shownTopics.length - 1] = hereTopic

  const places: Omit<Place, 'active'>[] = [
    { key: 'home', text: m.nav_home(), href: '/', children: [] },
    {
      key: 'posts',
      text: m.nav_posts(),
      href: '/posts',
      children: [
        { href: '/posts', text: m.nav_all(), active: pathname === '/posts' },
        ...shownCats.map((c) => ({ href: `/categories/${c.slug}`, text: c.name, count: c.postCount, active: under(pathname, `/categories/${c.slug}`) })),
        ...(restCats > 0 ? [{ href: '/categories', text: m.nav_rest_categories({ count: restCats }), active: pathname === '/categories', more: true }] : []),
      ],
    },
    {
      key: 'journal',
      text: m.nav_notes(),
      href: '/notes',
      children: [
        { href: '/notes', text: m.nav_all_notes(), active: pathname === '/notes' },
        ...shownTopics.map((t) => ({ href: `/notes/topics/${t.slug}`, text: t.name, count: t.noteCount, active: under(pathname, `/notes/topics/${t.slug}`) })),
        { href: '/notes/topics', text: m.nav_all_topics(), active: pathname === '/notes/topics', more: true },
      ],
    },
    { key: 'thoughts', text: m.nav_thinking(), href: '/thinking', children: [] },
    { key: 'timeline', text: m.nav_timeline(), href: '/timeline', children: [] },
    {
      key: 'friends',
      text: m.nav_friends(),
      href: '/friends',
      children: [
        { href: '/friends', text: m.nav_friends(), active: under(pathname, '/friends') },
        { href: '/fcircle', text: m.nav_fcircle(), active: under(pathname, '/fcircle') },
      ],
    },
  ]

  const activeKey =
    pathname === '/' ? 'home'
    : under(pathname, '/posts') || under(pathname, '/categories') ? 'posts'
    : under(pathname, '/notes') ? 'journal'
    : under(pathname, '/thinking') ? 'thoughts'
    : under(pathname, '/timeline') ? 'timeline'
    : under(pathname, '/friends') || under(pathname, '/fcircle') ? 'friends'
    : null

  // 換頁的方向：同一區的子列表之間照第二欄的順序（lib/page-depth.ts）
  const childOrder = places.flatMap((p) => p.children.map((c) => c.href)).join('|')
  useEffect(() => setNavChildOrder(childOrder.split('|')), [childOrder])

  return places.map((p) => ({ ...p, active: p.key === activeKey }))
}
