import { Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { getServerSession } from '@/lib/get-session'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { LoginForm } from './-components/login-form'
import Loading from '@/components/ui/loading'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login/')({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    const session = await getServerSession()
    if (session) {
      throw redirect({ href: search.redirect || '/' })
    }
  },
  head: () => pageHead({
    title: m.page_login_title(),
    path: '/login',
    noindex: true,
  }),
  headers: () => ({
    'Cache-Control': 'no-store',
  }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Loading />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
