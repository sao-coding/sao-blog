'use client'

import React from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'
import { flattenItems } from './children'

export interface MdxTabProps {
  /** 分頁標籤文字 */
  label: React.ReactNode
  children: React.ReactNode
}

/**
 * 單一分頁。需放在 <Tabs> 內。內容支援巢狀 markdown。
 */
export const MdxTab = ({ children }: MdxTabProps) => {
  return <>{children}</>
}

export interface MdxTabsProps {
  /** 預設選中的分頁（從 0 起算），預設 0 */
  defaultIndex?: number
  children: React.ReactNode
  className?: string
}

type TabElement = React.ReactElement<MdxTabProps>

// 不能用 child.type === MdxTab（Next.js RSC 序列化後 reference 會失效），
// 改以 label prop 是否存在來辨識 Tab 元素。
const isTab = (child: React.ReactNode): child is TabElement =>
  React.isValidElement(child) &&
  typeof (child.props as MdxTabProps).label !== 'undefined'

/**
 * 文章用的分頁元件（對應 Hexo 的 tabs tag）。
 * 題簽列就是分頁列，朱色指示線滑到選中的分頁；分頁裡只放一段程式碼時，
 * 程式碼直接貼齊框（.mdx-slot），不會框中框。所有分頁都留在 DOM（keepMounted），SSR 就有全文。
 *
 * ```mdx
 * <Tabs defaultIndex={0}>
 *   <Tab label="JavaScript">
 *   ```js
 *   console.log('hi')
 *   ```
 *   </Tab>
 *   <Tab label="Python">
 *   ```python
 *   print('hi')
 *   ```
 *   </Tab>
 * </Tabs>
 * ```
 */
export const MdxTabs = ({
  defaultIndex = 0,
  children,
  className,
}: MdxTabsProps) => {
  const tabs = flattenItems(children).filter(isTab)

  if (tabs.length === 0) return null

  return (
    <Tabs.Root
      defaultValue={Math.min(Math.max(defaultIndex, 0), tabs.length - 1)}
      className={cn('mdx-block mdx-frame mdx-tabs', className)}
    >
      <div className="mdx-block-head mdx-tabs-head">
        <Tabs.List className="mdx-tabs-list">
          {tabs.map((tab, index) => (
            <Tabs.Tab key={index} value={index} className="mdx-tab">
              {tab.props.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="mdx-tabs-indicator" />
        </Tabs.List>
      </div>
      {tabs.map((tab, index) => (
        <Tabs.Panel
          key={index}
          value={index}
          keepMounted
          className="mdx-tabs-panel mdx-slot"
        >
          {tab.props.children}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}
