// 導覽列 hover 卡片用的靜態 / 假連結設定
// （部落格尚未擁有的頁面先用 '#' 佔位）

export type MegaMenuLink = {
  text: string
  href: string
}

// 首頁卡片右側「頁面」清單
export const PROFILE_PAGE_LINKS: MegaMenuLink[] = [
  { text: '自述', href: '#' },
  { text: '此站點', href: '#' },
  { text: '歷史', href: '#' },
  { text: '迭代', href: '#' },
  { text: '留言', href: '#' },
  { text: '贊助', href: '#' },
]

// 「更多」卡片的連結改由 config/menu.ts 的 getNavLinks() 提供（與手機選單同一份）

// 站長資訊
export const SITE_OWNER = {
  name: '唯一',
  status: '在線',
  avatar: '/img/avatar-96.webp',
  fallback: '唯',
} as const
