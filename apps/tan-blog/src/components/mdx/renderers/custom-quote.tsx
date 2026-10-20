'use client'

import React from 'react'

export interface CustomQuoteProps {
  children: React.ReactNode
  author?: string
  variant?: 'default' | 'warning' | 'info' | 'success'
}

export const CustomQuote = ({
  children,
  author,
  variant = 'default',
}: CustomQuoteProps) => {
  const variantClasses = {
    default: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
    warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    info: 'border-l-cyan-500 bg-cyan-50 dark:bg-cyan-950/20',
    success: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  }

  return (
    <blockquote
      className={`
        my-6 border-l-4 pl-6 py-4 rounded-r-lg
        ${variantClasses[variant]}
      `}
    >
      <div className="text-base italic leading-relaxed">{children}</div>
      {author && (
        <footer className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
          — {author}
        </footer>
      )}
    </blockquote>
  )
}
