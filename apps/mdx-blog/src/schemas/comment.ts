/**
 * 留言表單 Zod 驗證模式
 * @module schemas/comment
 */

import { z } from 'zod'

/** 留言表單驗證 schema */
export const commentSchema = z.object({
  displayUsername: z.string().min(1, { message: '暱稱為必填欄位' }),
  email: z
    .string()
    .min(1, { message: 'Email 為必填欄位' })
    .email({ message: 'Email 格式不正確' }),
  website: z
    .string()
    .url({ message: '請輸入有效的網址' })
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(1, { message: '留言內容為必填欄位' })
    .refine((val) => val.trim().length > 0, {
      message: '全空白留言無法送出',
    }),
})

/** 留言表單值型別（由 schema 推導） */
export type CommentFormValues = z.infer<typeof commentSchema>
