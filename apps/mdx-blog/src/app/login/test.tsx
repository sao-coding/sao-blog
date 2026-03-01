'use client'
import React, { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { ErrorComponent, LoadingComponent } from '@/components'

export default function LoginPage() {
  // 登入狀態
  const [loginData, setLoginData] = useState({
    username: 'testuser',
    password: 'password123',
  })
  // 註冊狀態，預設填入值
  const [registerData, setRegisterData] = useState({
    username: 'testuser',
    password: 'testpass',
    email: 'test@example.com',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 登入
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      // 使用 username 登入
      const res = await authClient.signIn.username({
        username: loginData.username,
        password: loginData.password,
      })
      setMessage('登入成功！' + JSON.stringify(res))
    } catch (err) {
      const error = err as { message?: string }
      setError(error.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  // 註冊
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      // 註冊用 email/password/username
      const res = await authClient.signUp.email({
        email: registerData.email,
        password: registerData.password,
        username: registerData.username,
        name: registerData.username, // 可用 username 當作 name
      })
      setMessage('註冊成功！' + JSON.stringify(res))
    } catch (err) {
      const error = err as { message?: string }
      setError(error.message || '註冊失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded shadow">
      <h1 className="text-2xl font-bold mb-4">登入</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder="帳號"
          value={loginData.username}
          onChange={(e) =>
            setLoginData({ ...loginData, username: e.target.value })
          }
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="密碼"
          type="password"
          value={loginData.password}
          onChange={(e) =>
            setLoginData({ ...loginData, password: e.target.value })
          }
        />
        <button
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          type="submit"
          disabled={loading}
        >
          登入
        </button>
      </form>

      <h2 className="text-xl font-bold mt-8 mb-4">註冊 (預設值)</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder="帳號"
          value={registerData.username}
          onChange={(e) =>
            setRegisterData({ ...registerData, username: e.target.value })
          }
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="密碼"
          type="password"
          value={registerData.password}
          onChange={(e) =>
            setRegisterData({ ...registerData, password: e.target.value })
          }
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          type="email"
          value={registerData.email}
          onChange={(e) =>
            setRegisterData({ ...registerData, email: e.target.value })
          }
        />
        <button
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
          type="submit"
          disabled={loading}
        >
          註冊
        </button>
      </form>

      <div className="mt-4">
        {loading && <LoadingComponent />}
        {error && <ErrorComponent error={error} />}
        {message && (
          <div className="text-green-600 bg-green-100 p-2 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
