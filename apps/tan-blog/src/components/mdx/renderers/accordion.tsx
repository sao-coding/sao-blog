'use client'

import React from 'react'
import { Accordion } from '@base-ui/react/accordion'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { flattenItems } from './children'

export interface MdxAccordionItemProps {
  /** 折疊標題 */
  title: React.ReactNode
  /** 預設是否展開 */
  open?: boolean
  children: React.ReactNode
}

/**
 * 單一折疊項。需放在 <Accordion> 內。內容支援巢狀 markdown。
 */
export const MdxAccordionItem = ({ children }: MdxAccordionItemProps) => {
  // 實際 render 由父層 <Accordion> 處理，這裡僅作為設定承載（資料元件）
  return <>{children}</>
}
MdxAccordionItem.displayName = 'MdxAccordionItem'

export interface MdxAccordionProps {
  /** 是否允許同時展開多項，預設只展開一項 */
  multiple?: boolean
  children: React.ReactNode
  className?: string
}

type ItemElement = React.ReactElement<MdxAccordionItemProps>

const isAccordionItem = (child: React.ReactNode): child is ItemElement =>
  React.isValidElement(child) &&
  (child.type === MdxAccordionItem ||
    (child.type as { displayName?: string })?.displayName ===
      'MdxAccordionItem')

/**
 * 文章用的折疊面板（對應 Hexo 的 folding/tabs）。
 * 一個框、髮絲線分隔各項；箭頭在標題左側，展開時轉向並染朱，內文對齊標題文字。
 * 收起的內容用 hidden="until-found" 留在 DOM：SSR 輸出就有全文，瀏覽器的頁內搜尋也找得到。
 *
 * ```mdx
 * <Accordion>
 *   <AccordionItem title="問題一" open>
 *   答案內容，支援 **markdown**
 *   </AccordionItem>
 *   <AccordionItem title="問題二">
 *   另一段答案
 *   </AccordionItem>
 * </Accordion>
 * ```
 */
export const MdxAccordion = ({
  multiple = false,
  children,
  className,
}: MdxAccordionProps) => {
  const items = flattenItems(children).filter(isAccordionItem)

  const defaultValue = items
    .map((item, index) => (item.props.open ? index : null))
    .filter((v): v is number => v !== null)

  return (
    <Accordion.Root
      multiple={multiple}
      defaultValue={defaultValue}
      hiddenUntilFound
      className={cn('mdx-block mdx-frame mdx-accordion', className)}
    >
      {items.map((item, index) => (
        <Accordion.Item key={index} value={index} className="mdx-accordion-item">
          <Accordion.Header className="mdx-accordion-header">
            <Accordion.Trigger className="mdx-accordion-trigger">
              <ChevronRightIcon aria-hidden />
              <span className="min-w-0">{item.props.title}</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="mdx-accordion-panel">
            <div className="mdx-accordion-content">{item.props.children}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
