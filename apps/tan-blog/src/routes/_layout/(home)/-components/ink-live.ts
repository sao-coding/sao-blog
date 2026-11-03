// 首頁筆跡的連線（DESIGN.md 第 5 節）：今天紙上的乾痕（HTTP）＋別人正在寫的筆（oRPC over WebSocket）＋送出自己寫的筆。
// 每個看首頁的人都連（看得到別人寫）；只有登入的人送得出去（伺服器只收登入的）。
// 斷線就隔一會兒重連，重連後重拿一次今天的紙（斷線時漏掉的筆畫才補得回來）。
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/websocket'
import type { AppRouterClient } from '@sao-blog/api/routers/index'
import type { InkEvent } from '@sao-blog/api/routers/home-ink'
import { env } from '@sao-blog/env/tan-blog'
import { client as http } from '@/lib/orpc'
import type { Pigment } from './brush-pigment'

/** [x, y, 粗細, 距起筆的毫秒]；x、y、粗細以鳥居高為 1，原點是柱腳中間 */
export type UnitPt = [number, number, number, number]
/** mine：自己寫的（橡皮擦擦得到） */
export type Trace = { id: string; pigment: Pigment; points: UnitPt[]; mine?: boolean }
export type { InkEvent }
export type WriteInput = { sid: string; pigment: Pigment; pts: UnitPt[]; done: boolean }
export type WriteResult = Awaited<ReturnType<AppRouterClient['homeInk']['write']>>

export function connectInk(on: { today: (traces: Trace[], inkLeft: number | null) => void; event: (e: InkEvent) => void }) {
  let stopped = false
  let ws: WebSocket | null = null
  let rpc: AppRouterClient | null = null
  let retry = 0
  let timer = 0

  const loadToday = async () => {
    try {
      const res = await http.homeInk.today()
      if (!stopped) on.today(res.strokes as Trace[], res.ink?.left ?? null)
    } catch {
      // 拿不到就先空著，下次重連再拿
    }
  }

  const open = () => {
    if (stopped) return
    const url = env.VITE_SERVER_URL.replace(/^http/, 'ws') + '/ws/rpc'
    const sock = new WebSocket(url)
    ws = sock
    const link = new RPCLink({ websocket: sock })
    rpc = createORPCClient<AppRouterClient>(link)
    const again = () => {
      if (stopped || ws !== sock) return
      ws = null
      rpc = null
      // 2、4、8… 秒，最多 30 秒
      timer = window.setTimeout(open, Math.min(30_000, 2000 * 2 ** retry++))
    }
    sock.addEventListener('close', again)
    sock.addEventListener('open', () => {
      if (reconnecting) void loadToday()
      reconnecting = true
      retry = 0
      void (async () => {
        try {
          const events = await rpc!.homeInk.live()
          for await (const e of events) {
            if (stopped) break
            if (e.type !== 'ping') on.event(e)
          }
        } catch {
          // 斷了：close 會重連
        }
        if (!stopped && sock.readyState === WebSocket.OPEN) sock.close()
      })()
    })
  }
  // 今天的紙先用 HTTP 拿（WebSocket 連不上也看得到乾痕）
  let reconnecting = false
  void loadToday()
  open()

  return {
    /** 送一段筆畫；沒連上、沒登入、被擋都回 null */
    async write(input: WriteInput): Promise<WriteResult | null> {
      if (!rpc || ws?.readyState !== WebSocket.OPEN) return null
      try {
        return await rpc.homeInk.write(input)
      } catch {
        return null
      }
    },
    /** 橡皮擦：擦掉自己的幾筆 */
    async eraseMine(ids: string[]) {
      try {
        return await http.homeInk.eraseMine({ ids })
      } catch {
        return null
      }
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      ws?.close()
      ws = null
    },
  }
}
