'use client'

import React from 'react'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertType =
  | 'note'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export interface MdxAlertProps {
  /** 提示類型，決定顏色與圖示 */
  type?: AlertType
  /** 標題（可選），省略則只顯示內文 */
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const typeConfig: Record<
  AlertType,
  { icon: LucideIcon; wrapper: string; iconColor: string; title: string }
> = {
  note: {
    icon: Lightbulb,
    wrapper:
      'border-l-gray-400 bg-gray-50 dark:border-l-gray-500 dark:bg-gray-900/40',
    iconColor: 'text-gray-500 dark:text-gray-400',
    title: 'text-gray-800 dark:text-gray-200',
  },
  info: {
    icon: Info,
    wrapper:
      'border-l-blue-500 bg-blue-50 dark:border-l-blue-400 dark:bg-blue-950/30',
    iconColor: 'text-blue-500 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
  },
  success: {
    icon: CheckCircle2,
    wrapper:
      'border-l-green-500 bg-green-50 dark:border-l-green-400 dark:bg-green-950/30',
    iconColor: 'text-green-600 dark:text-green-400',
    title: 'text-green-800 dark:text-green-200',
  },
  warning: {
    icon: AlertTriangle,
    wrapper:
      'border-l-amber-500 bg-amber-50 dark:border-l-amber-400 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-200',
  },
  danger: {
    icon: XCircle,
    wrapper:
      'border-l-red-500 bg-red-50 dark:border-l-red-400 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-200',
  },
}

/**
 * 文章用的提示框（對應 Hexo butterfly 的 note tag）。
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
      className={cn(
        'my-6 flex gap-3 rounded-r-lg border-l-4 px-4 py-3 text-base',
        config.wrapper,
        className
      )}
    >
      <Icon
        className={cn('mt-1 size-5 shrink-0', config.iconColor)}
        aria-hidden
      />
      <div className="min-w-0 flex-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {title && (
          <p className={cn('mb-1 font-semibold', config.title)}>{title}</p>
        )}
        {children}
      </div>
    </div>
  )
}
