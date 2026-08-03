import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().min(1, '名稱為必填項'),
  slug: z.string().min(1, '網址別名為必填項'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '顏色格式不正確')
    .optional(),
  parentId: z.string().optional().nullable(),
})
