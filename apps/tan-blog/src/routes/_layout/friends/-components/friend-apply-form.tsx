'use client'

import { useRef, useState } from 'react'
import { Button } from '@sao-blog/ui/components/button'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import { Input } from '@sao-blog/ui/components/input'
import { client } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Turnstile, turnstileSiteKey, type TurnstileHandle } from '@/components/turnstile'
import { m } from '#/paraglide/messages'

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

export function FriendApplyForm() {
  const [values, setValues] = useState(EMPTY)
  const [circleEnabled, setCircleEnabled] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
      if (res.status === 'success') setValues(EMPTY)
    } catch {
      setResult({ ok: false, message: m.friends_failed() })
    } finally {
      // Turnstile token 只能用一次，不論成功失敗都要換新的
      turnstileRef.current?.reset()
      setSubmitting(false)
    }
  }

  const field = (key: TextKey, label: string, opts: { type?: string; required?: boolean; maxLength?: number } = {}) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">
        {label}
        {opts.required && <span className="ml-0.5 text-ink">*</span>}
      </span>
      <Input
        type={opts.type ?? 'text'}
        value={values[key]}
        required={opts.required}
        maxLength={opts.maxLength ?? 500}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  )

  return (
    <section id="apply" className="mt-20 max-w-2xl scroll-mt-24">
      <h2 className="font-wenkai text-2xl text-foreground">{m.friends_apply_title()}</h2>
      <p className="mt-2 font-wenkai text-sm leading-relaxed text-muted-foreground">{m.friends_apply_intro()}</p>

      <form onSubmit={onSubmit} className="relative mt-6 space-y-4">
        {/* 蜜罐：畫面與螢幕閱讀器都看不到，只有自動填表的機器人會填 */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field('name', m.friends_field_name(), { required: true, maxLength: 100 })}
          {field('url', m.friends_field_url(), { type: 'url', required: true })}
          {field('avatar', m.friends_field_avatar(), { type: 'url', required: true })}
          {field('email', m.friends_field_email(), { type: 'email', required: true, maxLength: 255 })}
        </div>
        {field('description', m.friends_field_description(), { required: true, maxLength: 200 })}
        {field('feedUrl', m.friends_field_feed(), { type: 'url' })}
        {field('backlinkUrl', m.friends_field_backlink(), { type: 'url' })}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={circleEnabled} onCheckedChange={(v) => setCircleEnabled(Boolean(v))} />
          {m.friends_field_circle()}
        </label>

        <Turnstile ref={turnstileRef} action="friend" onToken={setTurnstileToken} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting || waitingForTurnstile}>
            {submitting ? m.friends_submitting() : m.friends_submit()}
          </Button>
          {result && (
            <p role="status" className={cn('text-sm', result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
