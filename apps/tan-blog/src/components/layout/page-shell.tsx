import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// 全站列表頁共用的版面寬度（比照 innei.in 實測）：
// - 單欄頁：內容 48rem（2xl 起 56rem）置中        → /thinking、/timeline、分類、專欄
// - 列表＋側欄：列表 44rem（2xl 起 52rem）＋ 間距 3rem ＋ 側欄 18rem，整組置中 → /posts、/notes
// 上下留白也統一，讓切換頁面時內容的起點與寬度一致。

// 單欄頁的外層：max-w 含左右 px-4（2rem），內容實際寬 48rem / 56rem
export const pageShellClass = 'mx-auto mt-28 w-full max-w-[50rem] px-4 pb-24 lg:mt-32 2xl:max-w-[58rem]'

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(pageShellClass, className)}>{children}</div>
}

export function PageWithSidebar({ children, sidebar }: { children: ReactNode; sidebar: ReactNode }) {
  return (
    <div className="mx-auto mt-28 w-full px-4 pb-24 lg:mt-32">
      <div className="mx-auto grid w-full max-w-[65rem] gap-12 lg:grid-cols-[minmax(0,44rem)_18rem] 2xl:max-w-[73rem] 2xl:grid-cols-[minmax(0,52rem)_18rem]">
        <main className="mx-auto w-full min-w-0 max-w-[44rem] 2xl:max-w-[52rem]">{children}</main>
        {/* 側欄只在 lg 以上顯示；lg 以下只留置中的列表 */}
        <div data-enter="aside" className="hidden lg:block">{sidebar}</div>
      </div>
    </div>
  )
}
