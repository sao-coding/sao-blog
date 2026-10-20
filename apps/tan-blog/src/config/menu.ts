import {
  IconBrandLine,
  IconBrandThreads,
  IconBrandX,
  IconBubbleText,
  IconFenceFilled,
  IconHistory,
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
  icon: Icon
  link: string
  color: string
}[]

export const SOCIAL_LINKS: SocialLinks = [
  {
    icon: IconBrandGithub,
    link: 'https://github.com/sao-coding',
    color: 'bg-gray-900',
  },
  {
    icon: IconBrandFacebook,
    link: 'https://www.facebook.com/Black.HANK.X',
    color: 'bg-blue-700',
  },
  {
    icon: IconBrandLine,
    link: 'https://line.me/ti/p/t7Fr6CQFLi',
    color: 'bg-green-700',
  },
  {
    icon: IconBrandInstagram,
    link: 'https://www.instagram.com/_xox._.xox._.xox._.xox._.xox_',
    color: 'bg-pink-700',
  },
  {
    icon: IconBrandThreads,
    link: 'https://www.threads.net/@_xox._.xox._.xox._.xox._.xox_',
    color: 'bg-black',
  },
  {
    icon: IconBrandX,
    link: 'https://twitter.com/sao_coding',
    color: 'bg-gray-800',
  },
]
