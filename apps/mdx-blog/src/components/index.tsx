import React from 'react'

export function ErrorComponent({ error }: { error: string | Error }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className="text-red-500 bg-red-100 p-4 rounded">錯誤：{message}</div>
  )
}

export function LoadingComponent() {
  return <div className="animate-pulse text-gray-400">載入中...</div>
}
