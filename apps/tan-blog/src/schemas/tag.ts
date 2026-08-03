import { z } from 'zod'

export const tagFormSchema = z.object({
  name: z.string().min(1, '名稱為必填').max(50, '名稱不能超過 50 個字元'),
  slug: z
    .string()
    .min(1, '網址別名為必填')
    .max(50, '網址別名不能超過 50 個字元'),
  description: z.string().optional(),
  // color is required and must be a 6-digit HEX code like #A1B2C3
  color: z
    .string()
    .min(1, '顏色為必填')
    .regex(/^#[0-9A-Fa-f]{6}$/, '顏色必須是有效的 HEX 色碼'),
})

export type TagFormValues = z.infer<typeof tagFormSchema>
