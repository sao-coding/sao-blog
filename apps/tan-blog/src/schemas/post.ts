import { z } from 'zod'

export const postSchema = z.object({
  // slug
  slug: z.string().min(1, { message: '文章 slug 是必填欄位' }),

  // 文章標題
  title: z.string().min(1, { message: '文章標題是必填欄位' }),

  // 文章摘要
  summary: z.string().min(1, { message: '文章摘要是必填欄位' }),

  // 文章封面圖片（非必填）
  cover: z.string().optional(),

  // 文章狀態
  status: z.enum(['draft', 'published', 'archived'], {
    message: '文章狀態格式錯誤',
  }),

  // 文章類別
  category: z.string().min(1, { message: '文章類別是必填欄位' }),

  tags: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .min(1, { message: '文章標籤是必填欄位' }),

  // 文章內容
  content: z.string().min(1, { message: '文章內容是必填欄位' }),

  // 文章建立時間
  createdAt: z.string().datetime({ message: '文章建立時間格式錯誤' }),

  // 文章更新時間
  updatedAt: z.string().datetime({ message: '文章更新時間格式錯誤' }),

  // 設定選項
  allowComments: z.boolean(),
  pin: z.boolean(),
  // 置頂數字
  pinOrder: z.number().min(0).optional(),
})
