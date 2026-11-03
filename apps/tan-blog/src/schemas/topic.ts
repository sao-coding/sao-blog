import { z } from 'zod'

export const topicFormSchema = z.object({
  name: z.string().min(1, '名稱為必填項'),
  slug: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      '網址別名只能包含小寫字母、數字和連字符 (-)'
    ),
  description: z.string().optional(),
  introduce: z.string().min(1, '介紹為必填項'),
})
