// 導覽資料：設定檔的連結＋選單 API 的文章分類，標出目前所在（桌機墨帶與手機捲軸共用）
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { getNavLinks, isDocumentLink, type NavCard } from '@/config/menu'
import { orpc } from '@/lib/orpc'
import { currentContentLocale } from '@/lib/content-locale'

export type NavChild = { href: string; text: string; external: boolean; active: boolean; count?: number }
export type NavItem = {
  key: string
  text: string
  href?: string
  card?: NavCard
  active: boolean
  children: NavChild[]
}

export function useNavModel(): NavItem[] {
  const { pathname, searchStr } = useLocation({ select: (l) => ({ pathname: l.pathname, searchStr: l.searchStr }) })
  const { data: menuRes } = useQuery(orpc.menu.getMenu.queryOptions({ input: { locale: currentContentLocale() } }))
  const categories = menuRes?.status === 'success' ? menuRes.data.categories : null
  const here = pathname + (searchStr ?? '')

  const items = getNavLinks().map((link, index) => {
    const raw =
      link.card === 'posts' && categories
        ? categories.map((c) => ({ href: `/categories/${c.slug}`, text: c.name, show: true, count: c.postCount }))
        : (link.children?.filter((c) => c.show) ?? []).map((c) => ({ ...c, count: undefined as number | undefined }))
    const children: NavChild[] = raw.map((c) => ({
      href: c.href,
      text: c.text,
      count: c.count,
      external: isDocumentLink(c.href),
      // 有 query 的（時光的篩選）要整串相同；其餘是路徑前綴
      active: c.href.includes('?') ? here === c.href : pathname === c.href || pathname.startsWith(`${c.href}/`),
    }))
    return { key: link.href ?? `more-${index}`, text: link.text, href: link.href, card: link.card, active: false, children }
  })

  // 子項目命中優先（/notes/topics 屬於「時光」，不是「日記」）；沒有才看父路徑前綴
  const childHit = items.find((i) => i.children.some((c) => c.active))
  for (const item of items) {
    item.active = childHit
      ? item === childHit
      : Boolean(item.href) && (pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)))
  }
  return items
}
