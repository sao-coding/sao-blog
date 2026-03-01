import { z } from 'zod'

export const apiKeySchema = z.object({
  // 名稱
  name: z.string().min(1, { message: 'API 金鑰名稱是必填欄位' }),

  // 過期時間 (null 代表永不過期)
  expiresIn: z
    .number()
    .min(1, { message: '過期時間至少為 1 天' })
    .max(365, { message: '過期時間最多為 365 天' })
    .nullable(),
})
