import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { desc, eq } from "drizzle-orm";
import { commentBlocklist } from "@sao-blog/db/schema/index";
import { getSecuritySettings, saveSecuritySettings, securitySettingsSchema } from "@sao-blog/db/settings";
import { env } from "@sao-blog/env/server";
import z from "zod";

// 後台「留言與安全」：審核模式、內容過濾、限流規則、封鎖清單

const getSettings = protectedProcedure
    .route({ method: "GET", path: "/security/settings" })
    .handler(async () => ({
        status: "success",
        message: "取得成功",
        data: {
            settings: await getSecuritySettings(),
            // 只回傳「有沒有設定」，不回傳金鑰本身
            integrations: {
                turnstile: Boolean(env.TURNSTILE_SECRET_KEY),
                geoip: Boolean(env.MAXMIND_ACCOUNT_ID && env.MAXMIND_LICENSE_KEY),
                clientIpHeader: env.CLIENT_IP_HEADER,
                trustedProxies: env.TRUSTED_PROXIES.length,
            },
        },
    }));

const saveSettings = protectedProcedure
    .route({ method: "PUT", path: "/security/settings" })
    .input(securitySettingsSchema)
    .handler(async ({ input }) => ({
        status: "success",
        message: "設定已儲存",
        data: await saveSecuritySettings(input),
    }));

const getBlocklist = protectedProcedure
    .route({ method: "GET", path: "/security/blocklist" })
    .handler(async () => ({
        status: "success",
        message: "取得成功",
        data: await db.select().from(commentBlocklist).orderBy(desc(commentBlocklist.createdAt)),
    }));

const addBlock = protectedProcedure
    .route({ method: "POST", path: "/security/blocklist" })
    .input(z.object({
        type: z.enum(["ip", "email", "keyword"]),
        value: z.string().trim().min(1).max(512),
        note: z.string().trim().max(256).optional(),
    }))
    .handler(async ({ input }) => {
        // ip / email 統一小寫比對；keyword 保留原樣（比對時不分大小寫）
        const value = input.type === "keyword" ? input.value : input.value.toLowerCase();
        const [row] = await db.insert(commentBlocklist)
            .values({ type: input.type, value, note: input.note || null })
            .onConflictDoNothing()
            .returning();
        return row
            ? { status: "success", message: "已加入封鎖清單", data: row }
            : { status: "error", message: "清單裡已經有這一筆了", data: null };
    });

const removeBlock = protectedProcedure
    .route({ method: "DELETE", path: "/security/blocklist/{id}" })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        const [row] = await db.delete(commentBlocklist).where(eq(commentBlocklist.id, input.id)).returning();
        return row
            ? { status: "success", message: "已移除", data: null }
            : { status: "error", message: "找不到這一筆", data: null };
    });

export default {
    getSettings,
    saveSettings,
    getBlocklist,
    addBlock,
    removeBlock,
}
