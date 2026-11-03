import type { ReactNode } from 'react'
import { create } from 'zustand'

export type OverlayType = 'dialog' | 'drawer'

export type OverlayContent =
  | ReactNode
  | ((helpers: { close: () => void; id: string; type: OverlayType }) => ReactNode)

export interface DialogOverlayItem {
  kind: 'dialog'
  id: string
  title?: string
  description?: ReactNode
  content: OverlayContent
  className?: string
  showCloseButton?: boolean
}

export interface DrawerOverlayItem {
  kind: 'drawer'
  id: string
  title?: string
  description?: ReactNode
  content: OverlayContent
  className?: string
  direction?: 'top' | 'bottom' | 'left' | 'right'
}

export type OverlayItem = DialogOverlayItem | DrawerOverlayItem

interface ModalStackStore {
  stack: OverlayItem[]
  presentDialog: (item: Omit<DialogOverlayItem, 'kind' | 'id'> & { id?: string }) => string
  presentDrawer: (item: Omit<DrawerOverlayItem, 'kind' | 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
  dismissTop: () => void
  dismissAll: () => void
}

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/**
 * 全域 Overlay 堆疊狀態，統一管理 Dialog / Drawer 的開啟與關閉。
 */
export const useModalStackStore = create<ModalStackStore>((set, get) => ({
  stack: [],
  presentDialog: (item) => {
    const id = item.id ?? createId()
    const dialog: DialogOverlayItem = {
      kind: 'dialog',
      id,
      ...item,
    }
    set((state) => ({ stack: [...state.stack, dialog] }))
    return id
  },
  presentDrawer: (item) => {
    const id = item.id ?? createId()
    const drawer: DrawerOverlayItem = {
      kind: 'drawer',
      id,
      direction: item.direction ?? 'bottom',
      ...item,
    }
    set((state) => ({ stack: [...state.stack, drawer] }))
    return id
  },
  dismiss: (id) => {
    set((state) => ({ stack: state.stack.filter((item) => item.id !== id) }))
  },
  dismissTop: () => {
    set((state) => ({ stack: state.stack.slice(0, -1) }))
  },
  dismissAll: () => {
    if (get().stack.length === 0) return
    set({ stack: [] })
  },
}))
