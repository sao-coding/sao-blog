import { eventIterator, ORPCError } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { homeStrokes } from "@sao-blog/db/schema/index";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import z from "zod";
import { consumeRateLimit } from "../lib/rate-limit";

// 首頁筆跡（tan-blog DESIGN.md 第 5 節）：同時在首頁的人看到彼此寫；登入的人寫的一筆，乾了留一層淡乾痕到當天結束。
// 匿名的人只在自己的畫面上寫，不送上來（之後做「誰在瀏覽」再說）。
// 一筆邊寫邊送（write 每 0.1 秒左右一段），伺服器轉給其他人（live）；寫完（done）才存。轉發只在這台伺服器的記憶體裡：
// API 只有一台，不用 Redis；之後要多台，把 publish／listeners 換成跨機器的（Postgres LISTEN/NOTIFY 或 Redis）就好。
// 座標以鳥居為準：柱腳中間是原點、鳥居高是 1（見 db schema 的 homeStrokes）。

export const PIGMENTS = ["mo", "zhemo", "zheshi", "tenghuang", "zhilu", "shilu", "huaqing", "zhu"] as const;

/** 一個人一天的墨（以鳥居高為 1 的長度 × 1000）：鳥居大約三個鳥居高寬，橫過首屏一筆大約 3000 */
const DAILY_INK = 300_000;
/** 朱是強調色，鳥居也用朱：寫起來比較費墨 */
const ZHU_COST = 3;
/** 一筆最多幾個點 */
const MAX_POINTS = 1500;
/** 今天的紙上最多留幾筆（新的優先） */
const MAX_TODAY = 800;
/** 同時看著首頁的連線上限（全站、同一個 IP） */
const MAX_LIVE = 500;
const MAX_LIVE_PER_IP = 4;
/** 沒事的時候多久送一次心跳：Cloudflare 閒置約 100 秒會斷線 */
const PING_MS = 30_000;

const pigmentSchema = z.enum(PIGMENTS);
/** [x, y, 粗細, 距起筆的毫秒] */
const pointSchema = z.tuple([
  z.number().min(-8).max(8),
  z.number().min(-5).max(4),
  z.number().min(0).max(0.25),
  z.number().int().min(0).max(120_000),
]);
type Point = z.infer<typeof pointSchema>;

export type InkEvent =
  | { type: "chunk"; sid: string; pigment: (typeof PIGMENTS)[number]; pts: Point[]; done: boolean }
  | { type: "saved"; sid: string; id: string }
  | { type: "erase"; ids: string[] | "all" }
  | { type: "ping" };

const listeners = new Set<(e: InkEvent) => void>();
function publish(e: InkEvent) {
  for (const l of listeners) l(e);
}

/** 讓後台擦掉筆跡時通知正在看的人 */
export function publishInkErase(ids: string[] | "all") {
  publish({ type: "erase", ids });
}

/** 台北時間的今天（YYYY-MM-DD）：每天 0 點換紙 */
export function inkDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const round = (v: number, d: number) => Math.round(v * d) / d;

function strokeLength(pts: Point[]) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}

// 正在寫的筆（userId:sid → 點）；寫完存進資料庫，太久沒動的丟掉
const writing = new Map<string, { pigment: (typeof PIGMENTS)[number]; pts: Point[]; touched: number }>();
// 每個人今天用了多少墨：第一次寫時從資料庫算，之後在記憶體裡加
const used = new Map<string, number>();
let cleanedDay = "";

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of writing) if (now - v.touched > 30_000) writing.delete(k);
}, 30_000).unref?.();

async function usedInk(userId: string, day: string) {
  const key = `${userId}:${day}`;
  const hit = used.get(key);
  if (hit !== undefined) return hit;
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${homeStrokes.ink}), 0)::int` })
    .from(homeStrokes)
    .where(and(eq(homeStrokes.userId, userId), eq(homeStrokes.day, day)));
  const total = row?.total ?? 0;
  used.set(key, total);
  return total;
}

// 今天紙上的筆跡（只拿最新的 MAX_TODAY 筆）；登入的人另外帶自己今天還剩多少墨
const today = publicProcedure
  .route({ method: "GET", path: "/home/ink" })
  .handler(async ({ context }) => {
    const day = inkDay();
    const rows = await db
      .select({ id: homeStrokes.id, pigment: homeStrokes.pigment, points: homeStrokes.points, userId: homeStrokes.userId })
      .from(homeStrokes)
      .where(eq(homeStrokes.day, day))
      .orderBy(desc(homeStrokes.createdAt))
      .limit(MAX_TODAY);
    const userId = context.session?.user?.id;
    const left = userId ? Math.max(0, DAILY_INK - (await usedInk(userId, day))) : null;
    // 只告訴登入的人哪幾筆是自己的（橡皮擦只擦得到自己的）；不給別人的 userId
    const strokes = rows.reverse().map(({ userId: owner, ...r }) => ({ ...r, mine: !!userId && owner === userId }));
    return { day, strokes, ink: left === null ? null : { left, max: DAILY_INK } };
  });

let liveCount = 0;
const liveByIp = new Map<string, number>();

// 看著首頁的人：收別人正在寫的筆、存好的通知、後台擦掉的通知
const live = publicProcedure
  .output(eventIterator(z.custom<InkEvent>()))
  .handler(async function* ({ context, signal }) {
    const ip = context.ip ?? "unknown";
    if (liveCount >= MAX_LIVE || (liveByIp.get(ip) ?? 0) >= MAX_LIVE_PER_IP) {
      throw new ORPCError("TOO_MANY_REQUESTS");
    }
    liveCount++;
    liveByIp.set(ip, (liveByIp.get(ip) ?? 0) + 1);
    const queue: InkEvent[] = [];
    let wake: (() => void) | null = null;
    // 收不完（連線太慢）就丟掉後面的：筆跡幾秒就乾，晚到的也沒用
    const onEvent = (e: InkEvent) => {
      if (queue.length < 300) queue.push(e);
      wake?.();
    };
    listeners.add(onEvent);
    signal?.addEventListener("abort", () => wake?.(), { once: true });
    try {
      while (!signal?.aborted) {
        if (!queue.length) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          await new Promise<void>((r) => {
            wake = r;
            // 心跳：太久沒有事件就送一個 ping，連線才不會被代理切掉
            timer = setTimeout(r, PING_MS);
          });
          clearTimeout(timer);
          wake = null;
          if (signal?.aborted) break;
          if (!queue.length) {
            yield { type: "ping" } as InkEvent;
            continue;
          }
        }
        yield queue.shift()!;
      }
    } finally {
      listeners.delete(onEvent);
      liveCount--;
      const n = (liveByIp.get(ip) ?? 1) - 1;
      if (n <= 0) liveByIp.delete(ip);
      else liveByIp.set(ip, n);
    }
  });

// 寫：一筆的一段。轉給其他人；done 時存起來。墨用完了就不轉也不存（只在自己畫面上）
const write = protectedProcedure
  .input(
    z.object({
      sid: z.string().min(4).max(40),
      pigment: pigmentSchema,
      pts: z.array(pointSchema).max(120),
      done: z.boolean(),
    })
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;
    if (context.session.user.banned) throw new ORPCError("FORBIDDEN");
    const limit = consumeRateLimit([
      { key: `ink:user:${userId}:second`, max: 30, windowMs: 1000 },
      { key: `ink:user:${userId}:minute`, max: 900, windowMs: 60_000 },
    ]);
    if (!limit.ok) throw new ORPCError("TOO_MANY_REQUESTS");

    const day = inkDay();
    if (cleanedDay !== day) {
      // 換日：前幾天的紙收掉
      cleanedDay = day;
      void db.delete(homeStrokes).where(lt(homeStrokes.day, day)).catch((e) => console.error(e));
    }
    const key = `${userId}:${input.sid}`;
    let st = writing.get(key);
    if (!st) {
      st = { pigment: input.pigment, pts: [], touched: Date.now() };
      writing.set(key, st);
    }
    st.touched = Date.now();
    const room = MAX_POINTS - st.pts.length;
    const pts = input.pts.slice(0, Math.max(0, room)).map(
      (p) => [round(p[0], 1000), round(p[1], 1000), round(p[2], 10000), p[3]] as Point
    );

    // 墨量：這一段之後今天用掉的墨不能超過上限
    const cost = (pts: Point[]) => Math.round(strokeLength(pts) * 1000 * (st.pigment === "zhu" ? ZHU_COST : 1));
    const spent = await usedInk(userId, day);
    const after = cost(st.pts.concat(pts));
    if (spent + after > DAILY_INK) {
      writing.delete(key);
      return { ok: false as const, reason: "ink" as const, left: Math.max(0, DAILY_INK - spent) };
    }
    st.pts.push(...pts);
    // 轉給別人：只帶前端隨機產生的 sid，看不出是誰寫的；自己的那一份前端會略過
    publish({ type: "chunk", sid: input.sid, pigment: st.pigment, pts, done: input.done });

    if (!input.done) return { ok: true as const, left: Math.max(0, DAILY_INK - spent - after) };
    writing.delete(key);
    if (st.pts.length < 2) return { ok: true as const, left: Math.max(0, DAILY_INK - spent) };
    const ink = after;
    const [row] = await db
      .insert(homeStrokes)
      .values({ userId, day, pigment: st.pigment, points: st.pts, ink })
      .returning({ id: homeStrokes.id });
    used.set(`${userId}:${day}`, spent + ink);
    if (!row) return { ok: true as const, left: Math.max(0, DAILY_INK - spent - ink) };
    publish({ type: "saved", sid: input.sid, id: row.id });
    return { ok: true as const, id: row.id, left: Math.max(0, DAILY_INK - spent - ink) };
  });

// 橡皮擦：擦掉自己今天寫的幾筆，墨還回去
const eraseMine = protectedProcedure
  .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;
    const limit = consumeRateLimit([{ key: `ink:erase:${userId}:minute`, max: 60, windowMs: 60_000 }]);
    if (!limit.ok) throw new ORPCError("TOO_MANY_REQUESTS");
    const day = inkDay();
    const rows = await db
      .delete(homeStrokes)
      .where(and(eq(homeStrokes.userId, userId), eq(homeStrokes.day, day), inArray(homeStrokes.id, input.ids)))
      .returning({ id: homeStrokes.id, ink: homeStrokes.ink });
    if (rows.length) {
      const key = `${userId}:${day}`;
      const back = rows.reduce((n, r) => n + r.ink, 0);
      if (used.has(key)) used.set(key, Math.max(0, used.get(key)! - back));
      publish({ type: "erase", ids: rows.map((r) => r.id) });
    }
    return { deleted: rows.map((r) => r.id), left: Math.max(0, DAILY_INK - (await usedInk(userId, day))) };
  });

export default { today, live, write, eraseMine };
