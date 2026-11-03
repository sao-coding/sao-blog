import type { ReactElement } from 'react'
import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import { getMailSettings, getSiteSettings, type MailSettings } from '@sao-blog/db/site-settings'

// 寄信：SMTP 設定存在資料庫（後台「網站設定」），每次寄信時讀取，改設定不用重啟或重新 build。
// 信件內容是 src/emails/ 的 react-email 元件，同時產生 HTML 與純文字版本。

export interface MailMessage {
  to: string
  subject: string
  react: ReactElement
}

/** 設定是否足以寄信 */
export function mailReady(s: MailSettings): boolean {
  return s.enabled && Boolean(s.host && s.fromAddress)
}

/** 直接用給定的設定寄信（後台「寄測試信」用，失敗會丟錯） */
export async function sendMailWith(settings: MailSettings, message: MailMessage) {
  const site = await getSiteSettings()
  const [html, text] = await Promise.all([
    render(message.react),
    render(message.react, { plainText: true }),
  ])
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user ? { user: settings.user, pass: settings.password } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  const fromName = settings.fromName || site.name
  await transport.sendMail({
    from: fromName ? { name: fromName, address: settings.fromAddress } : settings.fromAddress,
    to: message.to,
    subject: message.subject,
    html,
    text,
  })
}

/**
 * 背景寄信：沒啟用就略過，失敗只記 log，不影響呼叫端的回應。
 * 呼叫端不要 await 它的結果來決定流程。
 */
export function sendMailInBackground(message: MailMessage) {
  void (async () => {
    try {
      const settings = await getMailSettings()
      if (!mailReady(settings)) return
      await sendMailWith(settings, message)
    } catch (err) {
      console.error('[mailer] 寄信失敗：', message.subject, err)
    }
  })()
}
