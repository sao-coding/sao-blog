import { z } from 'zod'

export const noteSchema = z.object({
  // 日記標題
  title: z.string().min(1, { message: '日記標題是必填欄位' }),

  // 日記內容
  content: z.string().min(1, { message: '日記內容是必填欄位' }),

  // 心情
  mood: z.string().min(1, { message: '心情是必填欄位' }),

  // 天氣
  weather: z.string().min(1, { message: '天氣是必填欄位' }),

  // 是否收藏
  bookmark: z.boolean(),

  // 狀態
  status: z.boolean(),

  // 位置座標（可選）
  coordinates: z.string().optional(),

  // 位置描述（可選）
  location: z.string().optional(),

  // 主題 ID（可選）
  topicId: z.string().nullable().optional(),

  // 日記建立時間
  createdAt: z.string().datetime({ message: '日記建立時間格式錯誤' }),

  // 日記更新時間
  updatedAt: z.string().datetime({ message: '日記更新時間格式錯誤' }),
})
