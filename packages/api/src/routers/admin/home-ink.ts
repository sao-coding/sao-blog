import { db } from "@sao-blog/db";
import { homeStrokes, user } from "@sao-blog/db/schema/index";
import { and, desc, eq, inArray } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "@sao-blog/api/index";
import { inkDay, publishInkErase } from "../home-ink";

// 後台：首頁今天的紙（tan-blog DESIGN.md 第 5 節）。看是誰寫的、擦掉一筆、擦掉某個人今天寫的全部。
// 擦掉後通知正在看首頁的人重新拿一次今天的紙。

const list = protectedProcedure
  .route({ method: "GET", path: "/home-ink" })
  .input(z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional())
  .handler(async ({ input }) => {
    const day = input?.day ?? inkDay();
    const rows = await db
      .select({
        id: homeStrokes.id,
        pigment: homeStrokes.pigment,
        points: homeStrokes.points,
        ink: homeStrokes.ink,
        createdAt: homeStrokes.createdAt,
        userId: homeStrokes.userId,
        userName: user.name,
        userEmail: user.email,
      })
      .from(homeStrokes)
      .leftJoin(user, eq(homeStrokes.userId, user.id))
      .where(eq(homeStrokes.day, day))
      .orderBy(desc(homeStrokes.createdAt));
    return { day, data: rows };
  });

const erase = protectedProcedure
  .route({ method: "POST", path: "/home-ink/erase" })
  .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }))
  .handler(async ({ input }) => {
    const rows = await db.delete(homeStrokes).where(inArray(homeStrokes.id, input.ids)).returning({ id: homeStrokes.id });
    if (rows.length) publishInkErase(rows.map((r) => r.id));
    return { deleted: rows.length };
  });

const eraseUser = protectedProcedure
  .route({ method: "POST", path: "/home-ink/erase-user" })
  .input(z.object({ userId: z.string().uuid(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
  .handler(async ({ input }) => {
    const rows = await db
      .delete(homeStrokes)
      .where(and(eq(homeStrokes.userId, input.userId), eq(homeStrokes.day, input.day ?? inkDay())))
      .returning({ id: homeStrokes.id });
    if (rows.length) publishInkErase(rows.map((r) => r.id));
    return { deleted: rows.length };
  });

export default { list, erase, eraseUser };
