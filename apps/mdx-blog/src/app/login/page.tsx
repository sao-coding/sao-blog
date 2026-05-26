import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { authClient } from '@/lib/auth-client'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Loading  from '@/components/ui/loading'

const LoginPage = async (props: { searchParams: Promise<{ redirect: string }> }) => {
  const searchParams = await props.searchParams
  const { data: session, error } = await authClient.getSession(
    {
      fetchOptions: {
        headers: await headers(),
      },
    }
  )
  console.log('Session:', session)
  console.log('Error:', error)
  if (session) {
    redirect(searchParams.redirect || '/')
  }

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

export default LoginPage