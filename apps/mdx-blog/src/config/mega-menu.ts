// 導覽列 hover 卡片用的靜態 / 假連結設定
// （部落格尚未擁有的頁面先用 '#' 佔位）

export type MegaMenuLink = {
  text: string
  href: string
}

// 首頁卡片右側「頁面」清單
export const PROFILE_PAGE_LINKS: MegaMenuLink[] = [
  { text: '自述', href: '#' },
  { text: '人設', href: '#' },
  { text: '靈魂', href: '#' },
  { text: '此站點', href: '#' },
  { text: '歷史', href: '#' },
  { text: '迭代', href: '#' },
  { text: '留言', href: '#' },
  { text: '關於友鏈', href: '#' },
  { text: '一對一諮詢', href: '#' },
  { text: '贊助', href: '#' },
]

// 更多卡片清單
export const MORE_LINKS: MegaMenuLink[] = [
  { text: 'GitHub', href: 'https://github.com/sao-coding' },
  { text: '標籤', href: '#' },
  { text: '關於', href: '#' },
  { text: 'RSS', href: '#' },
]

// 站長資訊
export const SITE_OWNER = {
  name: 'Innei',
  status: '在線',
  avatar: '/img/avatar.jpg',
  fallback: '唯',
} as const
