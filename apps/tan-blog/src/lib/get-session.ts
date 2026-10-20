import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { authClient } from './auth-client'

// SSR 專用：把目前請求的 cookie 轉發給 authClient.getSession()，
// 讓 beforeLoad 在伺服器端就能判斷登入狀態（client 端 authClient.getSession()
// 拿不到 httpOnly cookie 以外的資訊，且會在 hydration 前有一瞬間的未登入閃爍）。
export const getServerSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const { data: session } = await authClient.getSession({
      fetchOptions: {
        headers: headers as unknown as HeadersInit,
      },
    })
    return session
  }
)
