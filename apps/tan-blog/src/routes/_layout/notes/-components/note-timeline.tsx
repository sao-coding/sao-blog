import type { ApiResponse } from '@/types/api'
import type { NoteItem } from '@/types/note'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import type { TargetAndTransition } from 'motion/react'
import { AnimatePresence, motion } from 'motion/react'
import { memo } from 'react'
import { NoteTimelineItem } from './note-timeline-item'
import { env } from '@sao-blog/env/tan-blog'

const animateUl: TargetAndTransition = {
  transition: {
    staggerChildren: 0.5,
  },
}

const NoteTimeline = memo(() => {
  const { id } = useParams({ strict: false })

  if (!id) return null

  return <NoteTimelineImpl />
})

NoteTimeline.displayName = 'NoteTimeline'

const NoteTimelineImpl = () => {
  const { id } = useParams({ strict: false })

  const { data: timelineData } = useQuery<ApiResponse<NoteItem[]>>({
    queryKey: ['note-timeline', id],
    queryFn: async () => {
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/notes?id=${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      if (!res.ok) {
        throw new Error('Failed to fetch note timeline')
      }
      return res.json()
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

  return (
    <AnimatePresence>
      <motion.ul
        className="space-y-1 [&_svg]:hover:text-accent"
        animate={animateUl}
      >
        {(timelineData?.data || [])?.map((note) => {
          const isCurrent = note.id?.toString() === id
          return (
            <NoteTimelineItem
              layout
              key={note.id}
              active={isCurrent}
              title={note.title}
              id={note.id}
            />
          )
        })}
      </motion.ul>
    </AnimatePresence>
  )
}

export default NoteTimeline
