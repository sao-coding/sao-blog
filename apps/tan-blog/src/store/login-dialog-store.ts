import { create } from 'zustand'

interface LoginDialogStore {
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * 讀者登入對話框開關
 *
 * Header 的登入鈕、手機選單、留言／文章按讚等需要登入的操作共用同一個 LoginDialog。
 */
export const useLoginDialogStore = create<LoginDialogStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

/** 非 React 環境（事件處理）直接開啟登入對話框 */
export const openLoginDialog = () => useLoginDialogStore.getState().setOpen(true)
