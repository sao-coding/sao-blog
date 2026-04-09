'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@sao-blog/ui/components/breadcrumb'
import { BREADCRUMB_LABELS } from '@/config/breadcrumb'
import { useLocation } from '@tanstack/react-router'
import React from 'react'

export function AdminBreadcrumb() {
  const location = useLocation()
  const pathname = location.pathname
  const segments = pathname.split('/').filter(Boolean)
  // 加上 根路徑的處理 /admin 會被分割成 ['admin']，但我們希望它顯示為 '後台'
  segments.unshift('') // 在開頭添加一個空字符串，代表根路徑

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = '/admin' + segments.slice(0, index + 1).join('/')
          const isLast = index === segments.length - 1
          const label = BREADCRUMB_LABELS[segment] || segment

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
