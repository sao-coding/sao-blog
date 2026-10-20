import { useContext } from 'react'

import { CurrentOverlayContext } from '@/components/providers/modal-provider'

/**
 * 取得當前呈現中的 Overlay（Dialog/Drawer）控制權，方便在內容區觸發關閉。
 */
export const useCurrentModal = () => {
  const ctx = useContext(CurrentOverlayContext)
  if (!ctx) {
    throw new Error('useCurrentModal must be used within ModalProvider')
  }
  return ctx
}
