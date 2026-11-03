import { useState } from 'react'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'

// 路由層級的錯誤畫面（router 的 defaultErrorComponent）。
// 後端 API 出錯時 loader 會 throw，TanStack Router 把錯誤關在「出錯的那個路由」的邊界內，
// 外層 layout（header / footer）不受影響，使用者仍可導覽或重試。
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  if (import.meta.env.DEV) console.error(error)

  return (
    <div
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-2xl font-light">{m.error_title()}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{m.error_description()}</p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="max-w-full overflow-auto rounded bg-muted px-3 py-2 text-left text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true)
          // loader 的錯誤要 invalidate 才會重跑 loader 並重置邊界（reset() 只重置畫面）
          await router.invalidate()
          setRetrying(false)
        }}
        className="text-primary underline underline-offset-4 disabled:opacity-50"
      >
        {m.error_retry()}
      </button>
    </div>
  )
}
