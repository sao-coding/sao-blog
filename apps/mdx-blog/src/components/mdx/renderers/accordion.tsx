'use client'

import React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

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
  const items = React.Children.toArray(children).filter(isAccordionItem)

  const defaultValue = items
    .map((item, index) => (item.props.open ? index : null))
    .filter((v): v is number => v !== null)

  return (
    <Accordion
      multiple={multiple}
      defaultValue={defaultValue}
      className={cn(
        'my-6 rounded-lg border bg-card px-4 divide-y',
        className
      )}
    >
      {items.map((item, index) => (
        <AccordionItem key={index} value={index} className="border-b-0">
          <AccordionTrigger>{item.props.title}</AccordionTrigger>
          <AccordionContent>
            <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
              {item.props.children}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
