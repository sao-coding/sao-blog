'use client'

import React, { useState } from 'react'
import { Accordion } from '@base-ui/react/accordion'
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ListIcon,
  MessagesSquareIcon,
  PlusIcon,
} from 'lucide-react'
import { m } from '#/paraglide/messages'
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
  /** faq：每項標上「問／答」印章 */
  variant?: 'default' | 'faq'
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
 * - 題簽：共幾項＋「全部展開／收合」（單選模式按全部展開時，暫時允許多項同時打開）
 * - 每項左側是索引籤般的編號 01、02…；打開的那項編號染朱、左側一道朱線、底色微深，
 *   右側的 + 轉 45° 變成 ×
 * - variant="faq"：編號換成朱色方印「問」，內文前一枚淡色「答」
 * 收起的內容用 hidden="until-found" 留在 DOM：SSR 輸出就有全文，瀏覽器的頁內搜尋也找得到。
 *
 * ```mdx
 * <Accordion variant="faq">
 *   <AccordionItem title="可以轉載嗎？" open>
 *   可以，註明出處即可。
 *   </AccordionItem>
 *   <AccordionItem title="怎麼訂閱？">用 RSS。</AccordionItem>
 * </Accordion>
 * ```
 */
export const MdxAccordion = ({
  multiple = false,
  variant = 'default',
  children,
  className,
}: MdxAccordionProps) => {
  const items = flattenItems(children).filter(isAccordionItem)
  const [value, setValue] = useState<number[]>(() =>
    items
      .map((item, index) => (item.props.open ? index : null))
      .filter((v): v is number => v !== null)
  )
  // 單選模式下按「全部展開」：在使用者再全部收合之前，允許多項同時打開
  const [forceMultiple, setForceMultiple] = useState(false)
  const allOpen = items.length > 0 && value.length === items.length
  const faq = variant === 'faq'

  const toggleAll = () => {
    if (allOpen) {
      setValue([])
      setForceMultiple(false)
    } else {
      setValue(items.map((_, i) => i))
      setForceMultiple(true)
    }
  }

  return (
    <Accordion.Root
      multiple={multiple || forceMultiple}
      value={value}
      onValueChange={(next) => setValue(next as number[])}
      hiddenUntilFound
      data-variant={variant}
      className={cn('mdx-block mdx-frame mdx-accordion', className)}
    >
      <div className="mdx-block-head">
        <span className="mdx-block-label">
          {faq ? <MessagesSquareIcon aria-hidden /> : <ListIcon aria-hidden />}
          <span className="mdx-block-label-text">{m.accordion_count({ count: items.length })}</span>
        </span>
        {items.length > 1 && (
          <span className="mdx-tools">
            <button type="button" className="mdx-tool" onClick={toggleAll}>
              {allOpen ? <ChevronsDownUpIcon aria-hidden /> : <ChevronsUpDownIcon aria-hidden />}
              {allOpen ? m.accordion_collapse_all() : m.accordion_expand_all()}
            </button>
          </span>
        )}
      </div>
      {items.map((item, index) => (
        <Accordion.Item key={index} value={index} className="mdx-accordion-item">
          <Accordion.Header className="mdx-accordion-header">
            <Accordion.Trigger className="mdx-accordion-trigger">
              {faq ? (
                <span className="mdx-faq-seal" aria-hidden>
                  {m.faq_q()}
                </span>
              ) : (
                <span className="mdx-accordion-index" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}
              <span className="mdx-accordion-title">{item.props.title}</span>
              <PlusIcon className="mdx-accordion-icon" aria-hidden />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="mdx-accordion-panel">
            <div className="mdx-accordion-content">
              {faq && (
                <span className="mdx-faq-seal" data-answer aria-hidden>
                  {m.faq_a()}
                </span>
              )}
              <div className="mdx-accordion-body">{item.props.children}</div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
