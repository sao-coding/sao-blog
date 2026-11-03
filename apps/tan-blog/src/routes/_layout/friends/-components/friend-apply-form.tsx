'use client'

import { useRef, useState } from 'react'
import { client } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Turnstile, turnstileSiteKey, type TurnstileHandle } from '@/components/turnstile'
import { m } from '#/paraglide/messages'
import { FriendAvatar } from './friend-list'

const EMPTY = {
  name: '',
  url: '',
  avatar: '',
  description: '',
  email: '',
  feedUrl: '',
  backlinkUrl: '',
}

type TextKey = keyof typeof EMPTY

// 申請友鏈：一張卡片（DESIGN.md 第 1 節「卡片」）。上面是「你的名字」（游絲最後那顆虛線珠子連到這裡）：
// 邊填邊寫上站名與頭像；送出後留著，寫上「已送出」。欄位只有底下一條髮絲線，聚焦轉朱（styles.css .ink-field）。
export function FriendApplyForm() {
  const [values, setValues] = useState(EMPTY)
  const [circleEnabled, setCircleEnabled] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [offered, setOffered] = useState<{ name: string; avatar: string } | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const honeypotRef = useRef<HTMLInputElement | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const waitingForTurnstile = Boolean(turnstileSiteKey) && !turnstileToken

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { name, url, avatar, description, email } = values
    if (![name, url, avatar, description, email].every((v) => v.trim())) {
      setResult({ ok: false, message: m.friends_required() })
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await client.friend.applyFriend({
        ...values,
        feedUrl: values.feedUrl || undefined,
        backlinkUrl: values.backlinkUrl || undefined,
        circleEnabled,
        hp: honeypotRef.current?.value || undefined,
        turnstileToken: turnstileToken ?? undefined,
      })
      setResult({ ok: res.status === 'success', message: res.message })
      if (res.status === 'success') {
        setOffered({ name: values.name, avatar: values.avatar })
        setValues(EMPTY)
      }
    } catch {
      setResult({ ok: false, message: m.friends_failed() })
    } finally {
      // Turnstile token 只能用一次，不論成功失敗都要換新的
      turnstileRef.current?.reset()
      setSubmitting(false)
    }
  }

  const field = (key: TextKey, label: string, opts: { type?: string; required?: boolean; maxLength?: number } = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-display text-ink-3">
        {label}
        {opts.required && <span className="ml-0.5 text-zhu">*</span>}
      </span>
      <input
        type={opts.type ?? 'text'}
        value={values[key]}
        required={opts.required}
        maxLength={opts.maxLength ?? 500}
        className="ink-field"
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  )

  const previewName = offered?.name ?? values.name
  const previewAvatar = offered?.avatar ?? (/^https?:\/\/\S+$/.test(values.avatar) ? values.avatar : null)

  return (
    <section
      id="apply"
      data-enter
      className="mt-24 scroll-mt-24 rounded-lg border border-ink-5 px-5 py-8 sm:px-8"
    >
      {/* 你的名字：邊填邊寫上 */}
      <div aria-hidden className="mb-8">
        <p className="flex items-center gap-2.5">
          <span>
            <FriendAvatar key={previewAvatar ?? ''} name={previewName} src={previewAvatar} className={cn('size-12 text-lg', !previewName && !previewAvatar && 'border-dashed')} />
          </span>
          <span className={cn('font-display text-[1.375rem] leading-tight', previewName ? 'text-ink-1' : 'text-ink-4')}>
            {previewName || m.friends_offer_preview()}
          </span>
        </p>
        {offered && <p className="mt-1 pl-[3.625rem] font-display text-sm text-ink-3">{m.friends_offered()}</p>}
      </div>
      <div>
        <h2 className="font-display text-2xl text-ink-1">{m.friends_apply_title()}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{m.friends_apply_intro()}</p>

        <form onSubmit={onSubmit} className="relative mt-6 space-y-5">
          {/* 蜜罐：畫面與螢幕閱讀器都看不到，只有自動填表的機器人會填 */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {field('name', m.friends_field_name(), { required: true, maxLength: 100 })}
            {field('url', m.friends_field_url(), { type: 'url', required: true })}
            {field('avatar', m.friends_field_avatar(), { type: 'url', required: true })}
            {field('email', m.friends_field_email(), { type: 'email', required: true, maxLength: 255 })}
          </div>
          {field('description', m.friends_field_description(), { required: true, maxLength: 200 })}
          {field('feedUrl', m.friends_field_feed(), { type: 'url' })}
          {field('backlinkUrl', m.friends_field_backlink(), { type: 'url' })}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={circleEnabled}
              onChange={(e) => setCircleEnabled(e.target.checked)}
              className="size-4 accent-zhu"
            />
            {m.friends_field_circle()}
          </label>

          <Turnstile ref={turnstileRef} action="friend" onToken={setTurnstileToken} />

          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pt-1">
            <button
              type="submit"
              disabled={submitting || waitingForTurnstile}
              className="cursor-pointer font-display text-lg text-ink-1 underline decoration-zhu decoration-1 underline-offset-[6px] transition-colors hover:text-zhu disabled:cursor-default disabled:text-ink-4 disabled:decoration-ink-5"
            >
              {submitting ? m.friends_submitting() : `${m.friends_submit()} →`}
            </button>
            {result && (
              <p role="status" className={cn('text-sm', result.ok ? 'text-ink-1' : 'text-zhu')}>
                {result.message}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
