'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@sao-blog/ui/components/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { storageConfigInputSchema } from '@sao-blog/api/schema/storage'
import { Controller, useForm } from 'react-hook-form'
import type z from 'zod'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { orpc, queryClient } from '@/utils/orpc'

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type StorageConfig = RouterOutputs['admin']['storageConfig']['getConfigs']['data'][number]
type StorageConfigFormValues = z.input<typeof storageConfigInputSchema>

interface StorageConfigFormProps {
  mode: 'create' | 'edit'
  config?: StorageConfig
  onSuccess?: () => void
  onCancel?: () => void
}

const emptyConfig: StorageConfigFormValues = {
  name: '',
  endpoint: '',
  region: 'us-east-1',
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  publicUrl: '',
  forcePathStyle: true,
}

export function StorageConfigForm({ mode, config, onSuccess, onCancel }: StorageConfigFormProps) {
  const isEditMode = mode === 'edit'

  const form = useForm<StorageConfigFormValues>({
    resolver: zodResolver(storageConfigInputSchema),
    values:
      isEditMode && config
        ? {
            name: config.name,
            endpoint: config.endpoint,
            region: config.region,
            bucket: config.bucket,
            accessKeyId: config.accessKeyId,
            secretAccessKey: '',
            publicUrl: config.publicUrl ?? '',
            forcePathStyle: config.forcePathStyle,
          }
        : emptyConfig,
  })

  const {
    register,
    control,
    formState: { errors },
  } = form

  const createMutation = useMutation(orpc.admin.storageConfig.createConfig.mutationOptions())
  const updateMutation = useMutation(orpc.admin.storageConfig.updateConfig.mutationOptions())

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const submitLabel = isEditMode ? '儲存變更' : '新增設定'
  const submittingLabel = isEditMode ? '儲存中...' : '新增中...'

  const onSubmit = async (values: StorageConfigFormValues) => {
    try {
      if (isEditMode && config) {
        await updateMutation.mutateAsync({ id: config.id, ...values })
        toast.success('儲存設定更新成功！')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('儲存設定新增成功！')
      }

      await queryClient.invalidateQueries({
        queryKey: orpc.admin.storageConfig.getConfigs.queryOptions().queryKey,
      })
      onSuccess?.()
    } catch {
      toast.error(isEditMode ? '更新儲存設定時發生錯誤，請稍後再試。' : '新增儲存設定時發生錯誤，請稍後再試。')
    }
  }

  const onValidationError = () => {
    toast.error('表單驗證失敗，請確認欄位內容。')
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(onSubmit, onValidationError)}
    >
      <FieldGroup className="space-y-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel>設定名稱</FieldLabel>
          <Input
            {...register('name')}
            placeholder="例如：RustFS 本機"
            aria-invalid={!!errors.name}
          />
          <FieldError errors={errors.name ? [errors.name] : []} />
        </Field>

        <Field data-invalid={!!errors.endpoint}>
          <FieldLabel>Endpoint</FieldLabel>
          <Input
            {...register('endpoint')}
            placeholder="https://s3.example.com"
            aria-invalid={!!errors.endpoint}
          />
          <FieldError errors={errors.endpoint ? [errors.endpoint] : []} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.region}>
            <FieldLabel>Region</FieldLabel>
            <Input
              {...register('region')}
              placeholder="us-east-1"
              aria-invalid={!!errors.region}
            />
            <FieldError errors={errors.region ? [errors.region] : []} />
          </Field>

          <Field data-invalid={!!errors.bucket}>
            <FieldLabel>Bucket</FieldLabel>
            <Input
              {...register('bucket')}
              placeholder="my-bucket"
              aria-invalid={!!errors.bucket}
            />
            <FieldError errors={errors.bucket ? [errors.bucket] : []} />
          </Field>
        </div>

        <Field data-invalid={!!errors.accessKeyId}>
          <FieldLabel>Access Key ID</FieldLabel>
          <Input
            {...register('accessKeyId')}
            autoComplete="off"
            aria-invalid={!!errors.accessKeyId}
          />
          <FieldError errors={errors.accessKeyId ? [errors.accessKeyId] : []} />
        </Field>

        <Field data-invalid={!!errors.secretAccessKey}>
          <FieldLabel>Secret Access Key</FieldLabel>
          <Input
            {...register('secretAccessKey')}
            type="password"
            autoComplete="off"
            placeholder={isEditMode ? '留空表示不變更' : undefined}
            aria-invalid={!!errors.secretAccessKey}
          />
          <FieldError errors={errors.secretAccessKey ? [errors.secretAccessKey] : []} />
        </Field>

        <Field data-invalid={!!errors.publicUrl}>
          <FieldLabel>公開網址（選填）</FieldLabel>
          <Input
            {...register('publicUrl')}
            placeholder="https://cdn.example.com（留空則使用 endpoint/bucket）"
            aria-invalid={!!errors.publicUrl}
          />
          <FieldError errors={errors.publicUrl ? [errors.publicUrl] : []} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            name="forcePathStyle"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <FieldLabel className="font-normal">使用 Path-style 存取（RustFS / MinIO 建議開啟）</FieldLabel>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
