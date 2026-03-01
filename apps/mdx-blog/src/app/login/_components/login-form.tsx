'use client'

import React, { useState } from 'react'
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
import { useRouter } from 'next/navigation'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  // 登入狀態
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await authClient.signIn.username({
      username: loginData.username,
      password: loginData.password,
    })
    console.log('login', { data, error })
    if (error) {
      toast.error(error.message || '登入失敗')
    } else {
      toast.success('登入成功！')
      // 重新導向到管理後台首頁
      router.push('/admin')
    }
    setLoading(false)
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>登入您的帳戶</CardTitle>
          <CardDescription>輸入使用者名稱與密碼以登入</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="username">使用者名稱</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="使用者名稱"
                  required
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">密碼</Label>
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
                    登入中...
                  </>
                ) : (
                  '登入'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
