import { z } from 'zod'

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, { message: '留言內容為必填欄位' })
    .max(2000, { message: '留言內容不可超過 2000 字' })
    .refine((val) => val.trim().length > 0, {
      message: '全空白留言無法送出',
    }),
})

export type CommentFormValues = z.infer<typeof commentSchema>
