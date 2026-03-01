'use client'

import React from 'react'

export const AutoHeightWrapper: React.FC<{
  height?: number | null
  className?: string
  minHeight?: string | number
  children: React.ReactNode
}> = ({ height, className, minHeight, children }) => {
  const style: React.CSSProperties = {
    height: typeof height === 'number' && height > 0 ? `${height}px` : 'auto',
  }
  if (minHeight)
    style.minHeight =
      typeof minHeight === 'number' ? `${minHeight}px` : minHeight

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
