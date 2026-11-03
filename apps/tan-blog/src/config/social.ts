// 首頁的社群連結：細線圖示，名字放在 aria-label 與 title
import {
  IconBrandFacebook,
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandThreads,
  IconBrandX,
  IconRss,
} from '@tabler/icons-react'

export const SOCIAL_LINKS = [
  { name: 'GitHub', icon: IconBrandGithub, href: 'https://github.com/sao-coding' },
  { name: 'X', icon: IconBrandX, href: 'https://twitter.com/sao_coding' },
  { name: 'Threads', icon: IconBrandThreads, href: 'https://www.threads.net/@_xox._.xox._.xox._.xox._.xox_' },
  { name: 'Instagram', icon: IconBrandInstagram, href: 'https://www.instagram.com/_xox._.xox._.xox._.xox._.xox_' },
  { name: 'Facebook', icon: IconBrandFacebook, href: 'https://www.facebook.com/Black.HANK.X' },
  { name: 'RSS', icon: IconRss, href: '/rss.xml' },
] as const
