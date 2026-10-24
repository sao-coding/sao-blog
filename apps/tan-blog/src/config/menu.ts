import {
  IconBrandThreads,
  IconBrandX,
  IconBubbleText,
  IconFenceFilled,
  IconHistory,
  IconFriends,
  IconRss,
  IconUsersGroup,
} from '@tabler/icons-react'
import {
  IconBrandFacebook,
  IconBrandGithub,
  IconBrandInstagram,
  IconCategory,
  IconHome,
  IconSignature,
  // IconTags,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { m } from '#/paraglide/messages'

// 導覽列 hover 卡片類型（對應 components/layout/header/cards）
export type NavCard =
  | 'home'
  | 'posts'
  | 'notes'
  | 'thinking'
  | 'timeline'
  | 'more'

type NavLinks = {
  icon?: Icon
  href?: string
  text: string
  // 滑鼠移上時要展開的卡片（取代原本只靠 children 顯示的純文字下拉）
  card?: NavCard
  children?: { icon?: Icon; href: string; text: string; show: boolean }[]
}[]

/**
 * 不能走站內路由、要整頁載入的連結：外部網址，或 /rss.xml 這類伺服器路由（路徑結尾有副檔名）。
 * 選單渲染時這些要用原生 <a>，用 <Link> 會被當成前端路由而找不到頁面。
 */
export function isDocumentLink(href: string): boolean {
  return /^https?:\/\//.test(href) || /\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0] ?? '')
}

// 文案含翻譯訊息函式，須在元件內每次渲染呼叫，才能反映當前 request 的 locale
// （模組頂層常數在 SSR 下只會用初始化當下的 locale，跨語言請求會拿到錯誤文字）。
export function getNavLinks(): NavLinks {
  return [
    {
      icon: IconHome,
      href: '/',
      text: m.nav_home(),
      card: 'home',
    },
    {
      icon: IconSignature,
      href: '/posts',
      text: m.nav_posts(),
      card: 'posts',
      children: [
        {
          href: '/categories/programming',
          text: m.nav_posts_programming(),
          show: true,
        },
      ],
    },
    {
      icon: IconCategory,
      href: '/notes',
      text: m.nav_notes(),
      card: 'notes',
    },
    {
      icon: IconBubbleText,
      href: '/thinking',
      text: m.nav_thinking(),
      card: 'thinking',
    },
    {
      icon: IconHistory,
      href: '/timeline',
      text: m.nav_timeline(),
      card: 'timeline',
      children: [
        {
          icon: IconCategory,
          href: '/timeline?type=note',
          text: m.nav_timeline_notes(),
          show: true,
        },
        {
          icon: IconSignature,
          href: '/timeline?type=post',
          text: m.nav_timeline_posts(),
          show: true,
        },
        {
          icon: IconFenceFilled,
          href: '/notes/topics',
          text: m.nav_timeline_topics(),
          show: true,
        },
      ],
    },
    // 更多
    {
      text: m.nav_more(),
      card: 'more',
      children: [
        {
          icon: IconFriends,
          href: '/friends',
          text: m.nav_friends(),
          show: true,
        },
        {
          icon: IconUsersGroup,
          href: '/fcircle',
          text: m.nav_fcircle(),
          show: true,
        },
        {
          icon: IconBrandGithub,
          href: 'https://github.com/sao-coding',
          text: m.nav_github(),
          show: true,
        },
      ],
    },
  ]
}

// 社交link

type SocialLinks = {
  // 只有圖示的連結需要可讀名稱（螢幕閱讀器、Lighthouse link-name）
  name: string
  icon: Icon
  link: string
  color: string
}[]

export const SOCIAL_LINKS: SocialLinks = [
  {
    name: 'GitHub',
    icon: IconBrandGithub,
    link: 'https://github.com/sao-coding',
    color: 'bg-gray-900',
  },
  {
    name: 'Facebook',
    icon: IconBrandFacebook,
    link: 'https://www.facebook.com/Black.HANK.X',
    color: 'bg-blue-700',
  },
  {
    name: 'Instagram',
    icon: IconBrandInstagram,
    link: 'https://www.instagram.com/_xox._.xox._.xox._.xox._.xox_',
    color: 'bg-pink-700',
  },
  {
    name: 'Threads',
    icon: IconBrandThreads,
    link: 'https://www.threads.net/@_xox._.xox._.xox._.xox._.xox_',
    color: 'bg-black',
  },
  {
    name: 'X',
    icon: IconBrandX,
    link: 'https://twitter.com/sao_coding',
    color: 'bg-gray-800',
  },
  {
    name: 'RSS',
    icon: IconRss,
    link: '/rss.xml',
    color: 'bg-orange-600',
  },
]
