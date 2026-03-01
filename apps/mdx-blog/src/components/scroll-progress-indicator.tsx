'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import {
  usePageScrollLocationSelector,
  useViewportSelector,
  springScrollToTop,
} from '@/hooks/use-page-scroll'
import { ArrowUpIcon } from 'lucide-react'

interface ScrollProgressIndicatorProps {
  target: React.RefObject<HTMLElement | null>
}

export function ScrollProgressIndicator({
  target,
}: ScrollProgressIndicatorProps) {
  const [percentage, setPercentage] = useState(0)

  // 追蹤目標元素的滾動進度
  const { scrollYProgress } = useScroll({
    target: target,
    offset: ['start start', 'end end'],
  })

  // 使用 spring 動畫讓進度更流暢
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // 計算圓環的 stroke-dashoffset
  // 圓的周長 = 2πr，其中 r = 6
  const circumference = 2 * Math.PI * 6 // 37.699...

  const strokeDashoffset = useTransform(
    smoothProgress,
    [0, 1],
    [circumference, 0]
  )

  const windowHeight = useViewportSelector((v) => v.h)
  const shouldShow = usePageScrollLocationSelector(
    (scrollTop) => scrollTop > windowHeight / 5,
  )

  // 更新百分比顯示
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (latest) => {
      setPercentage(Math.round(latest * 100))
    })
    return unsubscribe
  }, [smoothProgress])

  

  return (
    <div className="">
      <hr className="my-4 h-[0.5px] border-0 bg-black !bg-opacity-30 dark:bg-white"></hr>

      <div className="flex items-center gap-2 mb-4">
        <svg
          width="14"
          height="14"
          className="shrink-0 text-muted-foreground"
          role="img"
          aria-label={`${percentage}%`}
        >
          {/* 背景圓環 */}
          <circle
            cx="7"
            cy="7"
            r="6"
            strokeLinecap="round"
            fill="none"
            className="text-muted-foreground"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* 進度圓環 */}
          <motion.circle
            cx="7"
            cy="7"
            r="6"
            strokeLinecap="round"
            fill="none"
            className="text-orange-500"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 7 7)"
            style={{
              transition: 'stroke-dashoffset 0.3s',
            }}
          />
        </svg>
        <span className="text-sm font-medium text-muted-foreground">
          {percentage}%
        </span>
      </div>
      {/* 回到頂部 當頁面滾動超過視窗高度 1/5 時顯示，點擊後平滑滾動回頂部。 */}
      <motion.button
        className="group text-sm text-muted-foreground hover:text-orange-500 transition-colors flex items-center gap-2"
        onClick={() => springScrollToTop()}
        initial={{ opacity: 0, y: 10 }}
        animate={shouldShow ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowUpIcon className="size-4 border rounded-full m-0.5 group-hover:border-primary"/>
        <span className='mt-0.5'>回到頂部</span>
      </motion.button>
    </div>
  )
}
