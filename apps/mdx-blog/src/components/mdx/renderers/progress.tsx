'use client'

import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type ProgressColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'pink'

export interface MdxProgressProps {
  /** 進度值 0–100 */
  value: number
  /** 左側標籤文字 */
  label?: React.ReactNode
  /** 進度條顏色 */
  color?: ProgressColor
  /** 是否顯示百分比數字，預設 true */
  showValue?: boolean
  className?: string
}

const colorMap: Record<ProgressColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

/**
 * 文章用的進度條（對應 Hexo butterfly 的 progress tag），常用於技能熟練度。
 *
 * ```mdx
 * <Progress value={90} label="HTML" color="amber" />
 * <Progress value={70} label="TypeScript" color="blue" />
 * ```
 */
export const MdxProgress = ({
  value,
  label,
  color = 'blue',
  showValue = true,
  className,
}: MdxProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('my-4', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showValue && (
            <span className="tabular-nums text-muted-foreground">
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <motion.div
          className={cn('h-full rounded-full', colorMap[color])}
          initial={{ width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
