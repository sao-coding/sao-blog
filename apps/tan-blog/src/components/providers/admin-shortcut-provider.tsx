'use client'

import { useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAdminShortcutStore } from '@/store/admin-shortcut-store'

function getDefaultRedirectPath(pathname: string): string {
  if (pathname === '/') return '/admin'
  if (pathname === '/posts') return '/admin/posts'
  if (pathname === '/notes') return '/admin/notes'
  if (pathname.startsWith('/notes/topics')) return '/admin/topics'
  if (pathname === '/friends' || pathname === '/fcircle') return '/admin/friends'
  if (pathname === '/thinking') return '/admin/thinking'
  if (pathname === '/timeline') return '/admin'
  if (pathname.startsWith('/categories')) return '/admin/categories'
  // /notes/[id] — note IDs are UUIDs, redirect to admin notes editor
  const noteMatch = pathname.match(/^\/notes\/([^/]+)$/)
  if (noteMatch) return `/admin/notes/editor/${noteMatch[1]}`
  // /posts/[slug] 由 PostClientPage 設定 override；尚未設定（載入中）或其他新路由一律回後台首頁，
  // 避免新增頁面時忘了對應而按 . 沒反應
  return '/admin'
}

export function AdminShortcutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const overridePath = useAdminShortcutStore((s) => s.overridePath)

  useEffect(() => {
    const redirectPath = overridePath ?? getDefaultRedirectPath(pathname)

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      if (e.key === '.' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.defaultPrevented) {
        // /admin 是代理到後台的另一個 app，不在本站 router 內：
        // 已登入時 /login 會 redirect 到 /admin/...，若走 client 導覽會被本站 router 判成 404，
        // 所以整頁重載，交給伺服器端 redirect 與代理處理
        navigate({
          to: '/login',
          search: { redirect: redirectPath },
          reloadDocument: true,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname, overridePath, navigate])

  return <>{children}</>
}
