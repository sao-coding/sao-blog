import React, { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { m } from '#/paraglide/messages'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  // login 路由自己有 validateSearch({ redirect: z.string().optional() })，
  // 這裡用 strict:false 讓元件不用綁死在單一路由型別上。
  const search = useSearch({ strict: false }) as { redirect?: string }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await authClient.signIn.username({
      username: loginData.username,
      password: loginData.password,
    })
    if (error) {
      toast.error(error.message || m.login_failed())
    } else {
      toast.success(m.login_success())
      // redirect 目標可能是本站路徑，也可能是 admin app 的完整網址（跨 origin），
      // 用 window.location 而非 router navigate 才能涵蓋兩種情況。
      window.location.href = search.redirect ?? '/admin'
    }
    setLoading(false)
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{m.login_title()}</CardTitle>
          <CardDescription>{m.login_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="username">{m.login_username_label()}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={m.login_username_placeholder()}
                  required
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">{m.login_password_label()}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    {m.login_submitting()}
                  </>
                ) : (
                  m.login_submit()
                )}
              </Button>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  authClient.signIn.social({
                    provider: 'github',
                    callbackURL: search.redirect ?? '/',
                  })
                }
              >
                {m.login_github()}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() =>
                  authClient.signIn.social({
                    provider: 'google',
                    callbackURL: search.redirect ?? '/',
                  })
                }
              >
                {m.login_google()}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
