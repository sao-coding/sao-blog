import {
  IconBrandLine,
  IconBrandThreads,
  IconBrandX,
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

type NavLinks = {
  icon?: Icon
  href?: string
  text: string
  children?: { icon?: Icon; href: string; text: string; show: boolean }[]
}[]

export const NAV_LINKS: NavLinks = [
  {
    icon: IconHome,
    href: '/',
    text: '首頁',
  },
  {
    icon: IconSignature,
    href: '/posts',
    text: '文章',
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
  },
  {
    icon: IconHistory,
    href: '/timeline',
    text: '時光',
    children: [
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
    children: [
      // { icon: IconUser, href: "/about", text: "關於我", show: true },
      // { icon: IconTags, href: "/tags", text: "標籤", show: true },
      {
        icon: IconBrandX,
        href: '/nav-test',
        text: '推特',
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
