import { env } from "@sao-blog/env/server";

// 發文/改文/刪文後主動通知前台清掉對應路徑的 ISR 快取，
// 不用等 revalidate 秒數到期，避免發布後看到舊內容。
export async function notifyBlogRevalidate(paths: string[]) {
    try {
        const res = await fetch(`${env.BLOG_URL}/api/revalidate`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-revalidate-secret": env.REVALIDATE_SECRET,
            },
            body: JSON.stringify({ paths }),
        });

        if (!res.ok) {
            console.error("Blog revalidate failed:", res.status, await res.text());
        }
    } catch (error) {
        // 快取清除失敗不應該讓發文操作整個失敗，記錄下來即可（最壞情況是等 revalidate TTL 到期）
        console.error("Blog revalidate request error:", error);
    }
}
