import React from 'react'

export default function AdminShell({
  title,
  actions,
  children,
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </>
  )
}
