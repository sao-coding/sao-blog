import React, { useRef, useState } from 'react'
import { Turnstile, turnstileSiteKey, type TurnstileHandle } from '@/components/turnstile'
import { safeRedirect } from '@/lib/safe-redirect'
import { useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@sao-blog/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import { Input } from '@sao-blog/ui/components/input'
import { Label } from '@sao-blog/ui/components/label'
import { authClient } from '@/lib/auth-client'
import { toast } from '@sao-blog/ui/components/toast'
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
  // 帳密登入的 Turnstile（後端 better-auth captcha plugin 驗證 x-captcha-response）
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken
  // login 路由自己有 validateSearch({ redirect: z.string().optional() })，
  // 這裡用 strict:false 讓元件不用綁死在單一路由型別上。
  const search = useSearch({ strict: false }) as { redirect?: string }
  // 只允許導回本站（防 open redirect），見 lib/safe-redirect.ts
  const redirectTo = safeRedirect(search.redirect, '/admin')
  const socialCallback = safeRedirect(search.redirect, '/')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await authClient.signIn.username(
      {
        username: loginData.username,
        password: loginData.password,
      },
      captchaToken ? { headers: { 'x-captcha-response': captchaToken } } : undefined
    )
    if (error) {
      // token 只能用一次，失敗後換一個新的
      turnstileRef.current?.reset()
      toast.add({
        title: error.status === 429 ? m.login_too_many_attempts() : error.message || m.login_failed(),
        type: 'error',
      })
    } else {
      toast.add({ title: m.login_success(), type: 'success' })
      // /admin 由本站代理到獨立部署的後台，不是 tan-blog 的路由，所以用整頁導覽而非 router navigate
      window.location.href = redirectTo
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
              <Turnstile ref={turnstileRef} action="login" onToken={setCaptchaToken} />
              <Button type="submit" className="w-full" disabled={loading || waitingForCaptcha}>
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
                    callbackURL: socialCallback,
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
                    callbackURL: socialCallback,
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
