'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
  /** 進度條顏色；不指定就是站上的強調色（朱） */
  color?: ProgressColor
  /** 是否顯示百分比數字，預設 true */
  showValue?: boolean
  className?: string
}

/** 進場時長條由 0 長到目標寬度；偏好減少動態時直接顯示結果 */
export function MeterFill({ width }: { width: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className="mdx-meter-fill"
      initial={reduceMotion ? false : { width: 0 }}
      whileInView={{ width: `${width}%` }}
      style={reduceMotion ? { width: `${width}%` } : undefined}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  )
}

/**
 * 文章用的進度條（對應 Hexo butterfly 的 progress tag），常用於技能熟練度。
 * 細長條、顏色走 blocks.css 的 [data-tone]；連續幾條會自動收緊成一組。
 *
 * ```mdx
 * <Progress value={90} label="HTML" color="amber" />
 * <Progress value={70} label="TypeScript" color="blue" />
 * ```
 */
export const MdxProgress = ({
  value,
  label,
  color,
  showValue = true,
  className,
}: MdxProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('mdx-block mdx-meter', className)} data-tone={color ?? ''}>
      {(label || showValue) && (
        <div className="mdx-meter-row">
          {label && <span className="mdx-meter-label">{label}</span>}
          {showValue && <span className="mdx-meter-value">{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
        className="mdx-meter-track"
      >
        <MeterFill width={clamped} />
      </div>
    </div>
  )
}
