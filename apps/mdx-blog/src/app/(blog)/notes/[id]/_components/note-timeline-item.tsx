'use client'

import type { TargetAndTransition } from 'motion/react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { CircleArrowRightIcon } from 'lucide-react'

interface NoteTimelineItemProps {
  active: boolean
  title: string
  id: number | string
  layout?: boolean
}

const initialLi: TargetAndTransition = {
  opacity: 0.0001,
}

const animateLi: TargetAndTransition = {
  opacity: 1,
}

const initialIcon: TargetAndTransition = {
  opacity: 0,
  x: -50,
}

const animateIcon: TargetAndTransition = {
  opacity: 1,
  x: 0,
}

export const NoteTimelineItem = ({
  active,
  title,
  id,
  layout,
}: NoteTimelineItemProps) => {
  return (
    <motion.li
      layout={layout}
      layoutId={layout ? `note-${id}` : undefined}
      initial={initialLi}
      animate={animateLi}
      exit={initialLi}
      className={`flex items-center gap-2 transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-current={active ? 'true' : undefined}
    >
      {/* LeftToRightTransitionView 左到右動畫 */}
      {active && (
        <motion.span
          className="flex items-center justify-center"
          initial={initialIcon}
          animate={animateIcon}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <CircleArrowRightIcon className="h-4 w-4" />
        </motion.span>
      )}
      <Link href={`/notes/${id}`} className="truncate">
        {title}
      </Link>
    </motion.li>
  )
}
