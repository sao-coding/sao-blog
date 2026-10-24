import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './index'
import { appSettings } from './schema'

// 後台「網站設定」：網站基本資料（key = 'site'）與寄信 SMTP（key = 'mail'）。
// 跟 settings.ts 的 security 一樣存在 app_settings 的 JSON，讀取時與預設值合併，
// 之後新增欄位不需要 migration，也不需要環境變數或重新 build。

export const siteSettingsSchema = z.object({
  /** 網站名稱，用在信件標題與署名 */
  name: z.string().trim().max(100),
  /** 前台網址，例如 https://blog.example.com */
  url: z.union([z.url(), z.literal('')]),
  /** 後台網址，信件裡「前往審核」的連結 */
  adminUrl: z.union([z.url(), z.literal('')]),
  /** 站長 email：收友鏈申請等通知 */
  ownerEmail: z.union([z.email(), z.literal('')]),
})

export const mailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  /** true = SMTPS（通常 465）；false = 視伺服器支援升級 STARTTLS（通常 587） */
  secure: z.boolean(),
  user: z.string().trim().max(255),
  password: z.string().max(500),
  fromName: z.string().trim().max(100),
  fromAddress: z.union([z.email(), z.literal('')]),
  /** 有人申請友鏈時通知站長 */
  notifyOwnerOnFriendApply: z.boolean(),
  /** 友鏈通過 / 拒絕時通知申請人 */
  notifyApplicantOnReview: z.boolean(),
})

export type SiteSettings = z.infer<typeof siteSettingsSchema>
export type MailSettings = z.infer<typeof mailSettingsSchema>

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: '',
  url: '',
  adminUrl: '',
  ownerEmail: '',
}

export const DEFAULT_MAIL_SETTINGS: MailSettings = {
  enabled: false,
  host: '',
  port: 465,
  secure: true,
  user: '',
  password: '',
  fromName: '',
  fromAddress: '',
  notifyOwnerOnFriendApply: true,
  notifyApplicantOnReview: true,
}

const CACHE_MS = 30_000

/** 單一 key 的讀寫：與預設值淺層合併、快取 30 秒、讀取失敗回預設值 */
function defineSetting<T extends object>(key: string, schema: z.ZodType<T>, defaults: T) {
  let cache: { value: T; at: number } | null = null

  const withDefaults = (stored: unknown): T => {
    const parsed = schema.safeParse({ ...defaults, ...((stored ?? {}) as object) })
    return parsed.success ? parsed.data : defaults
  }

  return {
    async get(): Promise<T> {
      if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
      try {
        const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
        const value = withDefaults(row?.value)
        cache = { value, at: Date.now() }
        return value
      } catch {
        return cache?.value ?? defaults
      }
    },
    async save(value: T): Promise<T> {
      const parsed = schema.parse(value)
      await db
        .insert(appSettings)
        .values({ key, value: parsed, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: parsed, updatedAt: new Date() } })
      cache = { value: parsed, at: Date.now() }
      return parsed
    },
  }
}

const site = defineSetting('site', siteSettingsSchema, DEFAULT_SITE_SETTINGS)
const mail = defineSetting('mail', mailSettingsSchema, DEFAULT_MAIL_SETTINGS)

export const getSiteSettings = site.get
export const saveSiteSettings = site.save
export const getMailSettings = mail.get
export const saveMailSettings = mail.save
