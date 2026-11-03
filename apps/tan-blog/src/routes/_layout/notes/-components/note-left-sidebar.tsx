import type React from 'react'
import { useHeightStore } from '@/store/height-store'
import { AutoHeightWrapper } from '@/components/auto-height-wrapper'
import NoteTimeline from './note-timeline'

export const NoteLeftSidebar: React.FC<{
  className?: string
}> = ({ className }) => {
  const height = useHeightStore((state) => state.height)

  return (
    <AutoHeightWrapper height={height} className={className}>
      {/* 換頁時自成一層（note-rail），不截圖、不暈：清單自己的 framer 動畫照常播（styles.css「墨洇」） */}
      <div className="sticky top-[120px] mt-[120px] min-h-[300px] [view-transition-name:note-rail]">
        <NoteTimeline />
      </div>
    </AutoHeightWrapper>
  )
}
