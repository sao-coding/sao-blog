'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@sao-blog/ui/components/breadcrumb'
import { SEGMENT_LABELS } from '@/config/navigation'
import { Link, useLocation } from '@tanstack/react-router'
import React from 'react'

// 編輯器網址最後一段是 uuid（/posts/editor/01a1…），顯示成「編輯」而不是一串亂碼
const looksLikeId = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(s) || /^\d+$/.test(s)

export function AdminBreadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.replace(/^\/admin/, '').split('/').filter(Boolean)
  const crumbs = [
    { href: '/', label: '後台' },
    ...segments.map((segment, i) => ({
      href: `/${segments.slice(0, i + 1).join('/')}`,
      label: looksLikeId(segment) ? '編輯' : (SEGMENT_LABELS[segment] ?? decodeURIComponent(segment)),
    })),
  ]

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          // 窄畫面只留最後兩層，避免擠成好幾行
          const hideOnMobile = index < crumbs.length - 2
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem className={hideOnMobile ? 'hidden whitespace-nowrap lg:inline-flex' : 'min-w-0 whitespace-nowrap'}>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.href}>{crumb.label}</Link>} />
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className={hideOnMobile ? 'hidden lg:block' : undefined} />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
