import { Elysia, t } from 'elysia'

// 公開 API - 設備相關
export const devicesRoutes = new Elysia()
  // .use(authMiddleware)
  .state({
    devicesStore: {
      // 儲存最新的 music 事件
      music: {
        time: '',
        type: 'music',
        status: '',
        title: '',
        artist: '',
      },
      // 儲存最新的 window 事件
      window: {
        time: '',
        type: 'window',
        status: '',
        process: '',
        app: '',
        title: '',
      },
      // 設定事件（接受 "music" 或 "window" 與事件物件）
      set(type: 'music' | 'window', payload: any) {
        if (type === 'music') {
          this.music = {
            time: payload.time || '',
            type: 'music',
            status: payload.status || '',
            title: payload.title || '',
            artist: payload.artist || '',
          }
        } else if (type === 'window') {
          this.window = {
            time: payload.time || '',
            type: 'window',
            status: payload.status || '',
            process: payload.process || '',
            app: payload.app || '',
            title: payload.title || '',
          }
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
    async ({ body, store, server }) => {
      const { type } = body as any

      if (type === 'music') {
        const { time, status, title, artist } = body as any
        if (!time || !status || !title || !artist) {
          return { status: 'error', message: '缺少 music 事件必要欄位' }
        }

        // 更新 state
        store.devicesStore.set('music', { time, status, title, artist })

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
        const { time, status, process, app: appName, title } = body as any
        if (!time || !process || !appName || !title) {
          return { status: 'error', message: '缺少 window 事件必要欄位' }
        }

        store.devicesStore.set('window', {
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
        music: ws.data.store?.devicesStore?.music || {
          time: '',
          type: 'music',
          status: '',
          title: '',
          artist: '',
        },
        window: ws.data.store?.devicesStore?.window || {
          time: '',
          type: 'window',
          status: '',
          process: '',
          app: '',
          title: '',
        },
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
        music: ws.data.store?.devicesStore?.music || {
          time: '',
          type: 'music',
          status: '',
          title: '',
          artist: '',
        },
        window: ws.data.store?.devicesStore?.window || {
          time: '',
          type: 'window',
          status: '',
          process: '',
          app: '',
          title: '',
        },
      }

      const response = {
        message: userMessage,
        time: Date.now(),
        deviceStatus: currentStatus,
      }

      ws.send(JSON.stringify(response))
    },
  })
