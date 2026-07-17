'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProgressColor } from './progress'

export interface MdxBenchmarkItemProps {
  /** 顯示名稱，例如「優化前」、「Webpack」 */
  label: React.ReactNode
  /** 數值，例如毫秒數、檔案大小、req/s */
  value: number
  /** 數值單位，例如 ms、MB、req/s，未設定時沿用 <Benchmark unit> */
  unit?: string
  /** 手動指定顏色，未設定時由 <Benchmark> 依 lowerIsBetter 自動判斷最佳項目 */
  color?: ProgressColor
  /** 手動標記是否為最佳結果；只要有任一 item 設定此 prop，整組改為手動模式 */
  highlight?: boolean
}

/** 單一比較項。需放在 <Benchmark> 內，本身不會單獨渲染。 */
export const MdxBenchmarkItem = (_props: MdxBenchmarkItemProps) => null
MdxBenchmarkItem.displayName = 'MdxBenchmarkItem'

export interface MdxBenchmarkProps {
  /** 數值越小代表越好（例如耗時），預設 true；設為 false 時數值越大越好（例如吞吐量） */
  lowerIsBetter?: boolean
  /** 套用到所有項目的預設單位，item 可用自己的 unit 覆寫 */
  unit?: string
  children: React.ReactNode
  className?: string
}

type ItemElement = React.ReactElement<MdxBenchmarkItemProps>

// 不能用 child.type === MdxBenchmarkItem（RSC 序列化後 reference 會失效），
// 改以 value prop 是否存在來辨識 BenchmarkItem 元素。
const isBenchmarkItem = (child: React.ReactNode): child is ItemElement =>
  React.isValidElement(child) &&
  typeof (child.props as MdxBenchmarkItemProps).value !== 'undefined'

const colorMap: Record<ProgressColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

/**
 * 文章用的效能比較長條圖，常用於優化前後 / 多方案速度對比。
 * 各長條寬度依「所有項目中的最大值」等比例縮放，而非各自獨立的 0–100%。
 *
 * ```mdx
 * <Benchmark unit="ms">
 *   <BenchmarkItem label="優化前" value={4200} />
 *   <BenchmarkItem label="優化後" value={180} />
 * </Benchmark>
 * ```
 */
export const MdxBenchmark = ({
  lowerIsBetter = true,
  unit,
  children,
  className,
}: MdxBenchmarkProps) => {
  const items = React.Children.toArray(children).filter(isBenchmarkItem)

  if (items.length === 0) return null

  const values = items.map((item) => item.props.value)
  const maxValue = Math.max(...values, 0)
  const bestValue = lowerIsBetter ? Math.min(...values) : Math.max(...values)
  const hasManualHighlight = items.some(
    (item) => typeof item.props.highlight !== 'undefined'
  )

  return (
    <div className={cn('my-4 space-y-3', className)}>
      {items.map((item, index) => {
        const { label, value, unit: itemUnit, color } = item.props
        const width = value === 0 ? 0 : Math.max((value / maxValue) * 100, 2)
        const isBest = hasManualHighlight
          ? !!item.props.highlight
          : value === bestValue
        const barColor = color ?? (isBest ? 'green' : 'blue')
        const displayUnit = itemUnit ?? unit ?? ''

        return (
          <div key={index}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 font-medium">
                {label}
                {isBest && (
                  <Zap
                    className="size-3.5 text-green-600 dark:text-green-400"
                    aria-label="最佳結果"
                  />
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {value.toLocaleString()}
                {displayUnit}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(width)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={typeof label === 'string' ? label : undefined}
              className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                className={cn('h-full rounded-full', colorMap[barColor])}
                initial={{ width: 0 }}
                whileInView={{ width: `${width}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
