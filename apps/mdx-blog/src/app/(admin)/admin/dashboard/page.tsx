import AdminShell from '../../_components/layout/admin-shell'
import { cookies } from 'next/headers'

// app/page.tsx (Server Component)
export default async function Page() {
  const cookieStore = await cookies()
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/get-session`,
    {
      headers: {
        cookie: cookieStore.toString(), // Next.js 15 可用 cookies() 取得
      },
      cache: 'no-store',
    }
  )
  const session = await res.json()

  return (
    <AdminShell title="儀表板">
      <div>
        {!session && <div>未登入</div>}
        {session && <div>歡迎 {session.user.name}</div>}
      </div>
    </AdminShell>
  )
}
