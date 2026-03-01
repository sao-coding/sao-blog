'use client'

import { cn } from '@/lib/utils'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { PointerEvent, useRef } from 'react'
import type { PostItem as Post } from '@/types/post'
import { ClockIcon, HashIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PostItemProps {
  post: Post
  options?: {
    maxOffsetPx?: number
    reduceMotion?: boolean
  }
}

const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches

const PostItem = ({ post, options = {} }: PostItemProps) => {
  const router = useRouter()
  const { maxOffsetPx = 8, reduceMotion = false } = options
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springConfig = { damping: 20, stiffness: 150 }
  const sx = useSpring(x, springConfig)
  const sy = useSpring(y, springConfig)
  const isTracking = useRef(false)

  const handlePointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (IS_TOUCH_DEVICE || reduceMotion) return

    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height

    // 設定進入點作為展開原點
    ref.current.style.setProperty('--origin-x', `${px * 100}%`)
    ref.current.style.setProperty('--origin-y', `${py * 100}%`)

    isTracking.current = true
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isTracking.current || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height

    const offsetX = (px - 0.5) * 2 * maxOffsetPx
    const offsetY = (py - 0.5) * 2 * maxOffsetPx

    x.set(offsetX)
    y.set(offsetY)
  }

  const handlePointerLeave = () => {
    if (!isTracking.current) return

    isTracking.current = false
    x.set(0)
    y.set(0)
  }

  return (
    <Link href={`/posts/${post.slug}`}>
      <motion.div
        ref={ref}
        // href={`/posts/${post.slug}`}
        style={{
          x: sx,
          y: sy,
          transition: 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)',
        }}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        className={cn(
          'relative block w-full rounded-lg py-8 text-card-foreground',
          'transition-shadow duration-300',
          // 遮罩效果 background-color: rgb(255 255 255 / .1);
          'before:content-[""] dark:before:bg-white/10',
          'before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-6 before:rounded-lg',
          'before:bg-gradient-radial from-transparent to-transparent',
          'before:opacity-0 before:scale-0 before:transition-all before:duration-[200ms] before:ease-[cubic-bezier(0.33,1,0.68,1)]',
          // Hover/Focus 狀態 - 從進入點展開
          'hover:before:from-primary/5 hover:before:to-transparent hover:before:opacity-100 hover:before:scale-100',
          'focus:before:from-primary/5 focus:before:to-transparent focus:before:opacity-100 focus:before:scale-100',
          // 追蹤時的漸層原點
          '[--origin-x:50%] [--origin-y:50%]',
          'before:bg-gradient-to-br before:origin-[var(--origin-x)_var(--origin-y)]',
          'before:transform-origin-[var(--origin-x)_var(--origin-y)]'
        )}
      >
        <h2 className="relative break-words text-2xl">{post.title}</h2>
        <div className="relative mt-4 space-y-2">
          <div className="relative overflow-hidden text-justify"></div>
        </div>
        <div className="flex min-w-0 shrink grow flex-wrap gap-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <ClockIcon className="size-4" />
            <span>
              {(() => {
                const d = new Date(post.createdAt)
                const year = d.getFullYear()
                const month = d.getMonth() + 1
                const day = d.getDate()
                const weekday = new Intl.DateTimeFormat(
                  navigator.language ?? 'zh-TW',
                  { weekday: 'long' }
                ).format(d)
                return `${year} 年 ${month} 月 ${day} 日 ${weekday}`
              })()}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <HashIcon className="size-4" />
            <div className="truncate">
              <button
                className="sao-link"
                onClick={() => router.push(`/categories/${post.category.slug}`)}
              >
                {post.category.name}
              </button>
              /
              {post.tags.map((tag, index) => (
                <span key={tag.slug} className="inline">
                  <button
                    className="sao-link"
                    onClick={() => router.push(`/tags/${tag.slug}`)}
                  >
                    {tag.name}
                  </button>
                  {index < post.tags.length - 1 && <span>, </span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export { PostItem }
