import {
  IconBrandLine,
  IconBrandThreads,
  IconBrandX,
  IconBubbleText,
  IconFenceFilled,
  IconHistory,
  IconPencil,
} from '@tabler/icons-react'
import {
  Icon,
  IconBrandFacebook,
  IconBrandGithub,
  IconBrandInstagram,
  IconCategory,
  IconHome,
  IconSignature,
  // IconTags,
  IconUser,
} from '@tabler/icons-react'

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

export const NAV_LINKS: NavLinks = [
  {
    icon: IconHome,
    href: '/',
    text: '首頁',
    card: 'home',
  },
  {
    icon: IconSignature,
    href: '/posts',
    text: '文章',
    card: 'posts',
    children: [
      {
        href: '/categories/programming',
        text: '程式設計',
        show: true,
      },
      // {
      //   icon: IconPencil,
      //   href: '/categories/archives',
      //   text: '歸檔',
      //   show: true,
      // },
    ],
  },
  {
    icon: IconCategory,
    href: '/notes',
    text: '日記',
    card: 'notes',
  },
  {
    icon: IconBubbleText,
    href: '/thinking',
    text: '想法',
    card: 'thinking',
  },
  {
    icon: IconHistory,
    href: '/timeline',
    text: '時光',
    card: 'timeline',
    children: [
      {
        icon: IconCategory,
        href: '/timeline?type=note',
        text: '筆記',
        show: true,
      },
      {
        icon: IconSignature,
        href: '/timeline?type=post',
        text: '文章',
        show: true,
      },
      {
        icon: IconFenceFilled,
        href: '/notes/topics',
        text: '專欄',
        show: true,
      },
    ],
  },
  // 更多
  {
    text: '更多',
    card: 'more',
    children: [
      // { icon: IconUser, href: "/about", text: "關於我", show: true },
      // { icon: IconTags, href: "/tags", text: "標籤", show: true },
      {
        icon: IconBrandGithub,
        href: 'https://github.com/sao-coding',
        text: 'GitHub',
        show: true,
      },
    ],
  },
]

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
