'use client'

import React from 'react'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'

export type AlertType =
  | 'note'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export interface MdxAlertProps {
  /** 提示類型，決定語意色與圖示 */
  type?: AlertType
  /** 標題（可選），省略時顯示類型名稱（附註／提示／完成／注意／警告） */
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}

// tone 對應 blocks.css 的 [data-tone]：低彩度、晝夜各一組，不用 Tailwind 原色
const typeConfig: Record<
  AlertType,
  { icon: LucideIcon; tone: string; label: () => string }
> = {
  note: { icon: Lightbulb, tone: 'neutral', label: m.alert_note },
  info: { icon: Info, tone: 'blue', label: m.alert_info },
  success: { icon: CheckCircle2, tone: 'green', label: m.alert_success },
  warning: { icon: AlertTriangle, tone: 'amber', label: m.alert_warning },
  danger: { icon: OctagonAlert, tone: 'red', label: m.alert_danger },
}

/**
 * 文章用的提示框（對應 Hexo butterfly 的 note tag），樣式是「眉批」：
 * 四角圓、框內左側一道圓頭語意色短線、極淡的底，標題用文楷。
 *
 * ```mdx
 * <Alert type="warning" title="注意">
 * 這裡可以寫**任意 markdown**內容
 * </Alert>
 * ```
 */
export const MdxAlert = ({
  type = 'note',
  title,
  children,
  className,
}: MdxAlertProps) => {
  const config = typeConfig[type] ?? typeConfig.note
  const Icon = config.icon

  return (
    <div
      role="note"
      data-tone={config.tone}
      className={cn('mdx-block mdx-alert', className)}
    >
      <Icon className="mdx-alert-icon" aria-hidden />
      <div className="min-w-0">
        <p className="mdx-alert-title">{title ?? config.label()}</p>
        <div className="mdx-alert-body">{children}</div>
      </div>
    </div>
  )
}
