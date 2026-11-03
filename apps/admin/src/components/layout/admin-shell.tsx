import type { ReactNode } from 'react'

// 各列表頁共用的頁首：標題＋一句說明＋右側主要動作（手機上動作換到下一行、撐滿寬度）
export default function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 *:max-sm:flex-1">{actions}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
