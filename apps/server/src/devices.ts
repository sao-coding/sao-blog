import { auth } from '@sao-blog/auth'
import { Elysia, t } from 'elysia'

type MusicStatus = 'playing' | 'paused' | 'idle'
type WindowStatus = 'active' | 'idle'

type MusicState = {
  time: string
  type: 'music'
  status: '' | MusicStatus
  title: string
  artist: string
}

type WindowState = {
  time: string
  type: 'window'
  status: '' | WindowStatus
  process: string
  app: string
  title: string
}

type MusicPayload = {
  time: string
  status: MusicStatus
  title: string
  artist: string
}

type WindowPayload = {
  time: string
  status: WindowStatus
  process: string
  app: string
  title: string
}

type StatusBody =
  | ({ type: 'music' } & MusicPayload)
  | ({ type: 'window' } & WindowPayload)

const DEFAULT_MUSIC_STATE: MusicState = {
  time: '',
  type: 'music',
  status: '',
  title: '',
  artist: '',
}

const DEFAULT_WINDOW_STATE: WindowState = {
  time: '',
  type: 'window',
  status: '',
  process: '',
  app: '',
  title: '',
}

const getApiKeyFromHeaders = (headers: Headers): string | null => {
  const authHeader = headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  const xApiKey = headers.get('x-api-key')?.trim() ?? ''

  return bearer || xApiKey || null
}

const getAuthorizedSession = async (headers: Headers) => {
  const apiKey = getApiKeyFromHeaders(headers)

  if (apiKey) {
    try {
      const verifyResult = await auth.api.verifyApiKey({
        body: { key: apiKey },
      })

      if (verifyResult.valid && verifyResult.key) {
        const session = await auth.api.getSession({
          headers: new Headers({ 'x-api-key': apiKey }),
        })

        if (session) {
          return session
        }
      }
    } catch {
      // API key 驗證失敗時，往下嘗試一般 session
    }
  }

  return auth.api.getSession({ headers })
}

// 公開 API - 設備相關
export const devicesRoutes = new Elysia()
  // .use(authMiddleware)
  .state({
    devicesStore: {
      // 儲存最新的 music 事件
      music: DEFAULT_MUSIC_STATE,
      // 儲存最新的 window 事件
      window: DEFAULT_WINDOW_STATE,
      setMusic(payload: MusicPayload) {
        this.music = {
          time: payload.time,
          type: 'music',
          status: payload.status,
          title: payload.title,
          artist: payload.artist,
        }
      },
      setWindow(payload: WindowPayload) {
        this.window = {
          time: payload.time,
          type: 'window',
          status: payload.status,
          process: payload.process,
          app: payload.app,
          title: payload.title,
        }
      },
    },
  })
  .get('/status', ({ store }) => {
    // 回傳目前的設備狀態（包含最新的 music 與 window 事件）
    return {
      status: 'success',
      message: '設備狀態',
      data: {
        music: store.devicesStore.music,
        window: store.devicesStore.window,
      },
    }
  })
  .post(
    '/status',
    async ({ body, request, set, store, server }) => {
      const session = await getAuthorizedSession(request.headers)
      if (!session) {
        set.status = 401
        return {
          status: 'error',
          message: '未授權：需要有效的 API Key 或登入 session',
        }
      }

      const payload = body as StatusBody
      const { type } = payload

      if (type === 'music') {
        const { time, status, title, artist } = payload
        if (!time || !status || !title || !artist) {
          return { status: 'error', message: '缺少 music 事件必要欄位' }
        }

        // 更新 state
        store.devicesStore.setMusic({ time, status, title, artist })

        const deviceStatus = {
          music: store.devicesStore.music,
          window: store.devicesStore.window,
        }

        server?.publish(
          'device-status',
          JSON.stringify({
            status: 'success',
            message: 'music 事件已更新',
            data: deviceStatus,
          })
        )

        return {
          status: 'success',
          message: 'music 事件已更新',
          data: deviceStatus,
        }
      } else if (type === 'window') {
        const { time, status, process, app: appName, title } = payload
        if (!time || !process || !appName || !title) {
          return { status: 'error', message: '缺少 window 事件必要欄位' }
        }

        store.devicesStore.setWindow({
          time,
          status,
          process,
          app: appName,
          title,
        })

        const deviceStatus = {
          music: store.devicesStore.music,
          window: store.devicesStore.window,
        }

        server?.publish(
          'device-status',
          JSON.stringify({
            status: 'success',
            message: 'window 事件已更新',
            data: deviceStatus,
          })
        )

        return {
          status: 'success',
          message: 'window 事件已更新',
          data: deviceStatus,
        }
      }

      return {
        status: 'error',
        message: "不支援的 type，請使用 'music' 或 'window'",
      }
    },
    {
      auth: true,
      body: t.Union([
        t.Object({
          time: t.String(),
          type: t.Literal('music'),
          status: t.Union([
            t.Literal('playing'),
            t.Literal('paused'),
            t.Literal('idle'),
          ]),
          title: t.String(),
          artist: t.String(),
        }),
        t.Object({
          time: t.String(),
          type: t.Literal('window'),
          status: t.Union([t.Literal('active'), t.Literal('idle')]),
          process: t.String(),
          app: t.String(),
          title: t.String(),
        }),
      ]),
    }
  )
  .ws('/ws', {
    // 測試用
    // 驗證傳入訊息
    body: t.Object({
      message: t.String(),
    }),

    open(ws) {
      console.log('WebSocket connected')

      // 訂閱設備狀態更新頻道
      ws.subscribe('device-status')

      // 發送目前的設備狀態給新連接的客戶端（包含 music 與 window 事件）
      const currentStatus = {
        music: ws.data.store?.devicesStore?.music || DEFAULT_MUSIC_STATE,
        window: ws.data.store?.devicesStore?.window || DEFAULT_WINDOW_STATE,
      }

      ws.send(
        JSON.stringify({
          status: 'success',
          message: '目前設備狀態',
          data: currentStatus,
        })
      )
    },

    close(ws) {
      console.log('WebSocket disconnected')
      // 取消訂閱（Bun 會自動處理，但明確寫出來比較清楚）
      ws.unsubscribe('device-status')
    },

    message(ws, message) {
      const { message: userMessage } = message

      // 回應使用者訊息，並包含目前設備狀態
      const currentStatus = {
        music: ws.data.store?.devicesStore?.music || DEFAULT_MUSIC_STATE,
        window: ws.data.store?.devicesStore?.window || DEFAULT_WINDOW_STATE,
      }

      const response = {
        message: userMessage,
        time: Date.now(),
        deviceStatus: currentStatus,
      }

      ws.send(JSON.stringify(response))
    },
  })
