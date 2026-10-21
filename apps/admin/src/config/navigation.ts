import {
  ChartColumnBigIcon,
  CloudIcon,
  FilesIcon,
  FolderIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MessageCircleHeartIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  ShieldIcon,
  SquarePenIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react'

// 後台導覽的唯一來源：側欄、麵包屑、⌘K 命令面板都讀這份

export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  /** 側欄右側的「＋」與命令面板的「新增」 */
  create?: { to: string; label: string }
  /** 命令面板的額外搜尋關鍵字 */
  keywords?: string[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: '總覽',
    items: [{ title: '儀表板', to: '/', icon: LayoutDashboardIcon, keywords: ['dashboard', '首頁'] }],
  },
  {
    label: '內容',
    items: [
      { title: '文章', to: '/posts', icon: SquarePenIcon, create: { to: '/posts/editor', label: '新增文章' }, keywords: ['post'] },
      { title: '日記', to: '/notes', icon: NotebookPenIcon, create: { to: '/notes/editor', label: '新增日記' }, keywords: ['note'] },
      { title: '想法', to: '/thinking', icon: MessageCircleHeartIcon, create: { to: '/thinking/editor', label: '新增想法' }, keywords: ['thinking'] },
      { title: '專欄', to: '/topics', icon: ChartColumnBigIcon, keywords: ['topic'] },
      { title: '分類', to: '/categories', icon: FolderIcon, keywords: ['category'] },
      { title: '標籤', to: '/tags', icon: TagIcon, keywords: ['tag'] },
    ],
  },
  {
    label: '互動',
    items: [
      { title: '留言', to: '/comments', icon: MessageSquareIcon, keywords: ['comment', '審核', 'moderation'] },
      { title: '安全設定', to: '/security', icon: ShieldIcon, keywords: ['security', '限流', 'rate limit', '封鎖', 'block', 'turnstile'] },
    ],
  },
  {
    label: '系統',
    items: [
      { title: '檔案', to: '/files', icon: FilesIcon, keywords: ['file', 'upload', '圖片'] },
      { title: '儲存設定', to: '/storage-settings', icon: CloudIcon, keywords: ['storage', 's3'] },
      { title: 'API 金鑰', to: '/api-keys', icon: KeyRoundIcon, keywords: ['api', 'key', 'mcp'] },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/** 目前路徑屬於哪個導覽項目（/posts/editor/123 → 文章） */
export function isNavActive(item: NavItem, pathname: string) {
  const path = pathname.replace(/^\/admin/, '') || '/'
  if (item.to === '/') return path === '/'
  return path === item.to || path.startsWith(`${item.to}/`)
}

/** 麵包屑用的路徑片段名稱 */
export const SEGMENT_LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map((i) => [i.to.slice(1), i.title])),
  editor: '編輯器',
}
