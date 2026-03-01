'use client'

import React from 'react'
import { useMeasuredHeight } from '@/hooks/use-measured-height'
import { useHeightStore } from '@/store/height-store'

export const NoteMainContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const setHeight = useHeightStore((state) => state.setHeight)

  const { ref } = useMeasuredHeight<HTMLDivElement>({
    debounce: 50,
    onChange: (h) => setHeight(h),
  })

  return <main ref={ref}>{children}</main>
}
