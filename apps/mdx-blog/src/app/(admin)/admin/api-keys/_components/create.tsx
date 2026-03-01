'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  DialogStack,
  DialogStackBody,
  DialogStackContent,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackHeader,
  DialogStackNext,
  DialogStackOverlay,
  DialogStackTitle,
  DialogStackTrigger,
} from '@/components/kibo-ui/dialog-stack'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { apiKeySchema } from '@/schemas/api-key'
import { CheckIcon, CopyIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateApiKeys } from '../_actions/api-keys-actions'
import { AnimatePresence, motion } from 'motion/react'

const API_KEY_PREFIX = 'sao-'

type CreateApiKeyForm = z.infer<typeof apiKeySchema>

const CreateApiKey = () => {
  const [newKey, setNewKey] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const form = useForm<CreateApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      name: '',
      expiresIn: null,
    },
  })

  const handleCreate = async (values: CreateApiKeyForm) => {
    try {
      const { data, error } = await authClient.apiKey.create({
        name: values.name,
        expiresIn: values.expiresIn ? 60 * 60 * 24 * values.expiresIn : null, // null 代表永不過期
        prefix: API_KEY_PREFIX,
      })

      if (error) {
        console.error('建立 API 金鑰失敗:', error)
        toast.error('建立 API 金鑰失敗，請稍後再試')
        return false
      }

      if (data?.key) {
        setNewKey(data.key)
        await updateApiKeys() // 重新驗證 API 金鑰列表
        return true
      }

      return false
    } catch (error) {
      console.error('建立 API 金鑰時發生錯誤:', error)
      toast.error('建立 API 金鑰時發生錯誤，請稍後再試')
      return false
    }
  }

  const handleCopy = async () => {
    if (!newKey) return

    try {
      await navigator.clipboard.writeText(newKey)
      setIsCopied(true)
      toast.success('API 金鑰已複製到剪貼簿')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('複製失敗:', error)
      toast.error('複製失敗，請手動選取並複製')
    }
  }

  const handleReset = () => {
    form.reset()
    setNewKey(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // 延遲重置狀態，確保對話框完全關閉後再重置
      setTimeout(() => {
        handleReset()
      }, 150)
    }
  }

  return (
    <DialogStack open={open} onOpenChange={handleOpenChange}>
      <DialogStackTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 size-4" />
          建立 API 金鑰
        </Button>
      </DialogStackTrigger>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>建立 API 金鑰</DialogStackTitle>
            <DialogStackDescription>
              建立一個新的 API 金鑰以存取您的專案。金鑰前綴為 &ldquo;
              {API_KEY_PREFIX}&rdquo;。
            </DialogStackDescription>
          </DialogStackHeader>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="py-4"
          >
            <FieldGroup className="space-y-4">
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel>
                  名稱 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  placeholder="例如：我的應用程式"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>

              <Controller
                control={form.control}
                name="expiresIn"
                render={({ field }) => (
                  <Field data-invalid={!!form.formState.errors.expiresIn}>
                    <FieldLabel>過期天數</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="留空代表永不過期"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(
                          value === '' ? null : parseInt(value) || null
                        )
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={field.disabled}
                      aria-invalid={!!form.formState.errors.expiresIn}
                    />
                    <FieldDescription>
                      API 金鑰的有效期限，最少 1 天，最多 365 天。留空代表永不過期
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.expiresIn]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
          <DialogStackFooter>
            <DialogStackNext asChild>
              <Button
                type="submit"
                disabled={!form.formState.isValid}
                onClick={async (e) => {
                  e.preventDefault()
                  const values = form.getValues()
                  const success = await handleCreate(values)
                  if (!success) {
                    e.preventDefault()
                  }
                }}
              >
                建立金鑰
              </Button>
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>API 金鑰已建立</DialogStackTitle>
            <DialogStackDescription>
              請複製並妥善保存您的 API 金鑰，離開此頁面後將無法再次查看。
            </DialogStackDescription>
          </DialogStackHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Input
                value={newKey ?? ''}
                readOnly
                className="pr-12 font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7"
                onClick={handleCopy}
                title="複製 API 金鑰"
              >
                {/* <CopyIcon className="size-4" /> */}
                {/* {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <CopyIcon className="size-4" />
                )} */}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isCopied ? 'check' : 'copy'}
                    data-slot="copy-button-icon"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isCopied ? (
                      <CheckIcon className="size-4 text-green-500" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <strong>重要提醒：</strong>請立即將此 API
              金鑰複製到安全的地方。關閉此對話框後，您將無法再次查看完整的金鑰。
            </div>
          </div>
          <DialogStackFooter>
            <Button onClick={() => handleOpenChange(false)}>完成</Button>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  )
}

export default CreateApiKey
