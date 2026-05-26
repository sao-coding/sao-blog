import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { authClient } from '@/lib/auth-client'
import { redirect } from 'next/navigation'

const LoginPage = async (props: { searchParams: Promise<{ redirect: string }> }) => {
  const searchParams = await props.searchParams
  const { data: session } = await authClient.getSession()

  if (session) {
    redirect(searchParams.redirect || '/')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

export default LoginPage