import { create } from 'zustand'

interface SearchStore {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
}

/**
 * 搜尋對話框開關
 *
 * 讓 Header 的搜尋按鈕與手機版選單（Drawer）共用同一個 SearchCommand。
 */
export const useSearchStore = create<SearchStore>((set) => ({
  open: false,
  setOpen: (open) =>
    set((state) => ({
      open: typeof open === 'function' ? open(state.open) : open,
    })),
}))
