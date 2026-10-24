import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { asc, eq } from "drizzle-orm";
import { friends } from "@sao-blog/db/schema/index";
import { getSecuritySettings } from "@sao-blog/db/settings";
import z from "zod";
import { normalizeSiteUrl, sanitizePublicUrl } from "@sao-blog/api/lib/friend-url";
import { consumeRateLimit, formatRetryAfter, HOUR } from "@sao-blog/api/lib/rate-limit";
import { turnstileEnabled, verifyTurnstile } from "@sao-blog/api/lib/turnstile";

// 友鏈頁：只回 approved，不含 email / ip 等私人欄位
const getFriends = publicProcedure
    .route({ method: "GET", path: "/friends" })
    .handler(async () => {
        const rows = await db
            .select({
                id: friends.id,
                name: friends.name,
                url: friends.url,
                avatar: friends.avatar,
                description: friends.description,
                group: friends.group,
            })
            .from(friends)
            .where(eq(friends.status, "approved"))
            .orderBy(asc(friends.group), asc(friends.sortOrder), asc(friends.createdAt));

        return {
            status: "success",
            message: "友鏈列表取得成功",
            data: rows,
        }
    });

// 申請友鏈：蜜罐 → Turnstile → IP 限流 → 網址檢查 → 重複檢查，通過後進待審
const applyFriend = publicProcedure
    .route({ method: "POST", path: "/friends/apply" })
    .input(z.object({
        name: z.string().trim().min(1).max(100),
        url: z.string().trim().min(1).max(500),
        avatar: z.string().trim().min(1).max(500),
        description: z.string().trim().min(1).max(200),
        email: z.email().max(255),
        feedUrl: z.string().trim().max(500).optional(),
        backlinkUrl: z.string().trim().max(500).optional(),
        circleEnabled: z.boolean().default(true),
        hp: z.string().max(200).optional(),
        turnstileToken: z.string().max(4096).optional(),
    }))
    .handler(async ({ input, context }) => {
        const settings = await getSecuritySettings();
        const ip = context.ip;

        // 蜜罐有值：假裝成功，不存
        if (settings.filters.honeypot && input.hp) {
            return { status: "success", message: "已送出申請，審核後會以 email 通知" }
        }

        if (settings.filters.turnstile && turnstileEnabled()) {
            if (!(await verifyTurnstile(input.turnstileToken, ip))) {
                return { status: "error", message: "人機驗證失敗，請重新整理後再試一次" }
            }
        }

        const rl = consumeRateLimit([{ key: `friend-apply:ip:${ip ?? "unknown"}:h`, max: 3, windowMs: HOUR }]);
        if (!rl.ok) {
            return { status: "error", message: `申請太頻繁了，請 ${formatRetryAfter(rl.retryAfter)}後再試` }
        }

        const url = normalizeSiteUrl(input.url);
        const avatar = sanitizePublicUrl(input.avatar);
        if (!url) return { status: "error", message: "網站網址無效（只接受公開的 http / https 網址）" }
        if (!avatar) return { status: "error", message: "頭像網址無效" }
        const feedUrl = input.feedUrl ? sanitizePublicUrl(input.feedUrl) : null;
        if (input.feedUrl && !feedUrl) return { status: "error", message: "RSS 網址無效" }
        const backlinkUrl = input.backlinkUrl ? sanitizePublicUrl(input.backlinkUrl) : null;
        if (input.backlinkUrl && !backlinkUrl) return { status: "error", message: "友鏈頁網址無效" }

        const [existing] = await db
            .select({ status: friends.status })
            .from(friends)
            .where(eq(friends.url, url))
            .limit(1);
        if (existing) {
            return {
                status: "error",
                message: existing.status === "pending" ? "這個網站已經申請過了，正在審核中" : "這個網站已經在友鏈名單中（或曾申請過），有問題請直接聯絡站長",
            }
        }

        await db.insert(friends).values({
            name: input.name,
            url,
            avatar,
            description: input.description,
            email: input.email.toLowerCase(),
            feedUrl,
            backlinkUrl,
            circleEnabled: input.circleEnabled,
            applyIp: ip,
            applyUa: context.userAgent?.slice(0, 500) ?? null,
        });

        return { status: "success", message: "已送出申請，審核後會以 email 通知" }
    });

export default {
    getFriends,
    applyFriend,
}

