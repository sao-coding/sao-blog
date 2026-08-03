import { useCallback } from 'react'

import type { DialogOverlayItem, DrawerOverlayItem } from '@/store/modal-store'
import { useModalStackStore } from '@/store/modal-store'

export interface PresentDialogOptions extends Omit<DialogOverlayItem, 'kind' | 'id'> {
  id?: string
}

export interface PresentDrawerOptions extends Omit<DrawerOverlayItem, 'kind' | 'id'> {
  id?: string
}

/**
 * 提供全域 Modal/Drawer 堆疊的操作介面。
 */
export const useModalStack = () => {
  const presentDialog = useModalStackStore((state) => state.presentDialog)
  const presentDrawer = useModalStackStore((state) => state.presentDrawer)
  const dismiss = useModalStackStore((state) => state.dismiss)
  const dismissTop = useModalStackStore((state) => state.dismissTop)
  const dismissAll = useModalStackStore((state) => state.dismissAll)

  const openDialog = useCallback(
    (options: PresentDialogOptions) => presentDialog(options),
    [presentDialog],
  )

  const openDrawer = useCallback(
    (options: PresentDrawerOptions) => presentDrawer(options),
    [presentDrawer],
  )

  return {
    openDialog,
    openDrawer,
    dismiss,
    dismissTop,
    dismissAll,
  }
}
