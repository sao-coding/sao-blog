import { adminProcedure } from "@sao-blog/api/index";
import {
    getMailSettings,
    getSiteSettings,
    mailSettingsSchema,
    saveMailSettings,
    saveSiteSettings,
    siteSettingsSchema,
    type MailSettings,
} from "@sao-blog/db/site-settings";
import { createElement } from "react";
import z from "zod";
import { sendMailWith } from "@sao-blog/api/lib/mailer";
import { TestMailEmail } from "../../emails/test-mail";

// 後台「網站設定」：網站基本資料與寄信 SMTP。
// SMTP 密碼不回傳給前端；儲存時密碼留空代表沿用原本的。

const mailInputSchema = mailSettingsSchema.extend({
    password: z.string().max(500).optional(),
});

/** 前端送來的密碼留空時，補回資料庫裡原本的 */
async function withStoredPassword(input: z.infer<typeof mailInputSchema>): Promise<MailSettings> {
    if (input.password) return { ...input, password: input.password };
    const stored = await getMailSettings();
    return { ...input, password: stored.password };
}

const getSettings = adminProcedure
    .route({ method: "GET", path: "/settings" })
    .handler(async () => {
        const [site, mail] = await Promise.all([getSiteSettings(), getMailSettings()]);
        const { password, ...mailRest } = mail;
        return {
            status: "success",
            message: "取得成功",
            data: {
                site,
                mail: { ...mailRest, hasPassword: Boolean(password) },
            },
        }
    });

const saveSettings = adminProcedure
    .route({ method: "PUT", path: "/settings" })
    .input(z.object({ site: siteSettingsSchema, mail: mailInputSchema }))
    .handler(async ({ input }) => {
        await Promise.all([
            saveSiteSettings(input.site),
            saveMailSettings(await withStoredPassword(input.mail)),
        ]);
        return { status: "success", message: "設定已儲存" }
    });

// 用表單上目前的值寄測試信（不必先存檔）
const sendTestMail = adminProcedure
    .route({ method: "POST", path: "/settings/test-mail" })
    .input(z.object({ to: z.email(), mail: mailInputSchema }))
    .handler(async ({ input }) => {
        const mail = await withStoredPassword(input.mail);
        if (!mail.host || !mail.fromAddress) {
            return { status: "error", message: "請先填寫 SMTP 主機與寄件地址" }
        }
        const site = await getSiteSettings();
        try {
            await sendMailWith(mail, {
                to: input.to,
                subject: `[${site.name || "部落格"}] 測試信`,
                react: createElement(TestMailEmail, { siteName: site.name || "部落格" }),
            });
            return { status: "success", message: `已寄出測試信到 ${input.to}` }
        } catch (err) {
            return { status: "error", message: `寄信失敗：${err instanceof Error ? err.message : String(err)}` }
        }
    });

export default {
    getSettings,
    saveSettings,
    sendTestMail,
}
