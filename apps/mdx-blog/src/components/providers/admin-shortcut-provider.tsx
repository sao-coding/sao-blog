'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdminShortcutStore } from '@/store/admin-shortcut-store'

function getDefaultRedirectPath(pathname: string): string | null {
  if (pathname === '/posts') return '/admin/posts'
  // /notes/[id] — note IDs are UUIDs, redirect stays on same note page
  if (pathname.startsWith('/notes/')) return pathname
  // /posts/[slug] — needs postId (UUID), handled by override from PostClientPage
  return null
}

export function AdminShortcutProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const overridePath = useAdminShortcutStore((s) => s.overridePath)

  useEffect(() => {
    const redirectPath = overridePath ?? getDefaultRedirectPath(pathname)
    if (!redirectPath) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      if (e.key === '.') {
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname, overridePath, router])

  return <>{children}</>
}
