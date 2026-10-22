'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { CheckCircle2Icon, CloudIcon, Loader2Icon, PlugZapIcon, XCircleIcon } from 'lucide-react'
import type { InferClientOutputs } from '@orpc/client'
import { Badge } from '@sao-blog/ui/components/badge'
import { Button } from '@sao-blog/ui/components/button'
import { cn } from '@sao-blog/ui/lib/utils'
import { StorageConfigRowActions } from '@/components/storage/storage-config-row-actions'
import { orpc } from '@/utils/orpc'
import type { client } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
export type StorageConfig = RouterOutputs['admin']['storageConfig']['getConfigs']['data'][number]

type TestState =
  | { phase: 'idle' }
  | { phase: 'ok'; at: Date }
  | { phase: 'error'; message: string; at: Date }

const timeFormatter = new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/**
 * 一組儲存設定一張卡片：啟用中的那張有一圈會滑動的 ring（切換啟用時滑過去），
 * 連線測試結果就地顯示在卡片上，不用另外跳 toast 再忘記結果。
 */
export function StorageConfigCard({ config }: { config: StorageConfig }) {
  const [test, setTest] = useState<TestState>({ phase: 'idle' })
  const testMutation = useMutation(orpc.admin.storageConfig.testConnection.mutationOptions())

  const runTest = async () => {
    try {
      const result = await testMutation.mutateAsync({ id: config.id })
      setTest(
        result.status === 'success'
          ? { phase: 'ok', at: new Date() }
          : { phase: 'error', message: result.message, at: new Date() },
      )
    } catch (e) {
      setTest({ phase: 'error', message: e instanceof Error ? e.message : '連線測試失敗', at: new Date() })
    }
  }

  const location = `${config.endpoint} · ${config.bucket}`

  return (
    <li
      className={cn(
        'relative isolate flex flex-col gap-3 rounded-xl border bg-card p-4',
        test.phase === 'error' && 'border-destructive/50 bg-destructive/5',
      )}
    >
      {config.isActive && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-xl ring-2 ring-primary"
          layoutId="active-storage-config"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}

      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="relative flex size-10 shrink-0 items-center justify-center rounded-lg text-primary"
        >
          <span className="absolute inset-0 rounded-lg bg-current opacity-15" />
          <CloudIcon className="relative size-5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium">{config.name}</span>
            {config.isActive && <Badge>啟用中</Badge>}
          </div>
          <span className="truncate font-mono text-xs text-muted-foreground" title={location}>
            {location}
          </span>
        </div>

        <StorageConfigRowActions config={config} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Meta label="Region" value={config.region} />
        <Meta label="存取方式" value={config.forcePathStyle ? 'Path-style' : 'Virtual-hosted'} />
        <Meta label="Access Key" value={config.accessKeyId} mono />
        <Meta label="公開網址" value={config.publicUrl || '使用 endpoint / bucket'} mono={!!config.publicUrl} />
      </dl>

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <TestResult test={test} pending={testMutation.isPending} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={testMutation.isPending}
          onClick={runTest}
        >
          {testMutation.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlugZapIcon className="size-3.5" />}
          測試連線
        </Button>
      </div>
    </li>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('truncate', mono && 'font-mono')} title={value}>
        {value}
      </dd>
    </div>
  )
}

function TestResult({ test, pending }: { test: TestState; pending: boolean }) {
  if (pending) {
    return <span className="text-xs text-muted-foreground">測試中…</span>
  }
  if (test.phase === 'ok') {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2Icon className="size-4 shrink-0" />
        <span className="truncate">連線正常 · {timeFormatter.format(test.at)}</span>
      </span>
    )
  }
  if (test.phase === 'error') {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-destructive" role="alert">
        <XCircleIcon className="size-4 shrink-0" />
        <span className="truncate" title={test.message}>
          {test.message}
        </span>
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">尚未測試連線</span>
}
