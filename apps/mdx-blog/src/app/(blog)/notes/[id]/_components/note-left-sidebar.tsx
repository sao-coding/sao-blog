'use client'

import { useHeightStore } from '@/store/height-store'
import { AutoHeightWrapper } from '@/components/auto-height-wrapper'
import NoteTimeline from './note-timeline'

export const NoteLeftSidebar: React.FC<{
  className?: string
}> = ({ className }) => {
  const height = useHeightStore((state) => state.height)

  return (
    <AutoHeightWrapper height={height} className={className}>
      <div className="sticky top-[120px] mt-[120px] min-h-[300px]">
        <NoteTimeline />
      </div>
    </AutoHeightWrapper>
  )
}
