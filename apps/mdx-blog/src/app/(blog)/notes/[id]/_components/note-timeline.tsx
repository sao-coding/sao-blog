'use client'

import { ApiResponse } from '@/types/api'
import { NoteItem } from '@/types/note'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { TargetAndTransition } from 'motion/react'
import { AnimatePresence, motion } from 'motion/react'
import { memo } from 'react'
import { NoteTimelineItem } from './note-timeline-item'

const animateUl: TargetAndTransition = {
  transition: {
    staggerChildren: 0.5,
  },
}

const NoteTimeline = memo(() => {
  const { id } = useParams()

  if (!id) return null

  return <NoteTimelineImpl />
})

NoteTimeline.displayName = 'NoteTimeline'

const NoteTimelineImpl = () => {
  // 獲取目前筆記id
  const { id } = useParams()

  // 獲取當前筆記的基本信息作為 initialData
  const { data: currentNote } = useQuery<ApiResponse<NoteItem>>({
    queryKey: ['current-note', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notes/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      if (!res.ok) {
        throw new Error('Failed to fetch current note')
      }
      return res.json()
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

  const { data: timelineData } = useQuery<ApiResponse<NoteItem[]>>({
    queryKey: ['note-timeline', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notes?id=${id}`,
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
    enabled: !!id, // 確保 id 存在時才執行查詢
    placeholderData: keepPreviousData,
  })

  // 準備 initialData，確保當前筆記總是在列表中
  const initialData = currentNote?.data
    ? [
        {
          id: currentNote.data.id,
          title: currentNote.data.title,
          createdAt: currentNote.data.createdAt,
          content: currentNote.data.content,
        },
      ]
    : []

  return (
    <AnimatePresence>
      <motion.ul
        className="space-y-1 [&_svg]:hover:text-accent"
        animate={animateUl}
      >
        {(timelineData?.data || initialData)?.map((note) => {
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
