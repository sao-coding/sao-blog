import { create } from 'zustand'
import { z } from 'zod'

/**
 * 滾動方向列舉
 */
const ScrollDirectionSchema = z.enum(['up', 'down'])
type ScrollDirection = z.infer<typeof ScrollDirectionSchema>

/**
 * 滾動資訊狀態 Schema
 */
const ScrollStateSchema = z.object({
  scrollTop: z.number().min(0),
  direction: ScrollDirectionSchema.nullable(),
  viewportHeight: z.number().min(0),
  viewportWidth: z.number().min(0),
})

type ScrollState = z.infer<typeof ScrollStateSchema>

interface ScrollStore extends ScrollState {
  /** 更新滾動位置 */
  setScrollTop: (scrollTop: number) => void
  /** 更新滾動方向 */
  setDirection: (direction: ScrollDirection | null) => void
  /** 更新視窗尺寸 */
  setViewport: (height: number, width: number) => void
  /** 批次更新滾動狀態 */
  updateScrollState: (partial: Partial<ScrollState>) => void
}

/**
 * 全域滾動資訊 Store
 *
 * 提供頁面滾動位置、方向與視窗尺寸，
 * 供 BackToTopFAB、Header、ScrollProgressIndicator 等元件共用。
 */
export const useScrollStore = create<ScrollStore>((set) => ({
  scrollTop: 0,
  direction: null,
  viewportHeight: 0,
  viewportWidth: 0,

  setScrollTop: (scrollTop) => set({ scrollTop }),
  setDirection: (direction) => set({ direction }),
  setViewport: (height, width) =>
    set({ viewportHeight: height, viewportWidth: width }),
  updateScrollState: (partial) => set(partial),
}))

export { ScrollDirectionSchema, ScrollStateSchema }
export type { ScrollDirection, ScrollState }
