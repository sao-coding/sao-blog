'use client'

import React from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

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
MdxTab.displayName = 'MdxTab'

export interface MdxTabsProps {
  /** 預設選中的分頁（從 0 起算），預設 0 */
  defaultIndex?: number
  children: React.ReactNode
  className?: string
}

type TabElement = React.ReactElement<MdxTabProps>

const isTab = (child: React.ReactNode): child is TabElement =>
  React.isValidElement(child) &&
  (child.type === MdxTab ||
    (child.type as { displayName?: string })?.displayName === 'MdxTab')

/**
 * 文章用的分頁元件（對應 Hexo 的 tabs tag）。
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
  const tabs = React.Children.toArray(children).filter(isTab)

  if (tabs.length === 0) return null

  return (
    <Tabs
      defaultValue={defaultIndex}
      className={cn('my-6', className)}
    >
      <TabsList className="flex-wrap">
        {tabs.map((tab, index) => (
          <TabsTrigger key={index} value={index}>
            {tab.props.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, index) => (
        <TabsContent
          key={index}
          value={index}
          className="rounded-lg border bg-card p-4 [&>:first-child]:mt-0 [&>:last-child]:mb-0"
        >
          {tab.props.children}
        </TabsContent>
      ))}
    </Tabs>
  )
}
