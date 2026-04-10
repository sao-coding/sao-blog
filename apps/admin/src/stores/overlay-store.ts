import { create } from 'zustand'
import type { ReactNode } from 'react'

export type OverlayKind = 'alert-dialog' | 'dialog'

export interface OverlayRenderResult {
  title: ReactNode
  description?: ReactNode
  body?: ReactNode
  cancelLabel?: ReactNode
  confirmLabel?: ReactNode
  confirmVariant?: 'default' | 'destructive'
  hideCancel?: boolean
  hideConfirm?: boolean
  confirmDisabled?: boolean
}

export interface OverlayRenderContext {
  close: () => void
  isPending: boolean
}

export type OverlayRenderFn = (
  context: OverlayRenderContext
) => OverlayRenderResult

export interface OverlayItem {
  id: string
  kind: OverlayKind
  isOpen: boolean
  isPending: boolean
  render: OverlayRenderFn
  onConfirm?: (context: OverlayRenderContext) => void | Promise<void>
  onCancel?: (context: OverlayRenderContext) => void
}

interface OverlayState {
  order: string[]
  items: Record<string, OverlayItem>
  openOverlay: (item: Omit<OverlayItem, 'isOpen' | 'isPending'>) => void
  closeOverlay: (id: string) => void
  setPending: (id: string, isPending: boolean) => void
  closeAllOverlays: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  order: [],
  items: {},
  openOverlay: (item) =>
    set((state) => {
      const nextOrder = state.order.includes(item.id)
        ? state.order
        : [...state.order, item.id]

      return {
        order: nextOrder,
        items: {
          ...state.items,
          [item.id]: {
            ...item,
            isOpen: true,
            isPending: false,
          },
        },
      }
    }),
  closeOverlay: (id) =>
    set((state) => {
      if (!state.items[id]) {
        return state
      }

      const nextItems = { ...state.items }
      delete nextItems[id]

      return {
        order: state.order.filter((itemId) => itemId !== id),
        items: nextItems,
      }
    }),
  setPending: (id, isPending) =>
    set((state) => {
      const current = state.items[id]
      if (!current) {
        return state
      }

      return {
        items: {
          ...state.items,
          [id]: {
            ...current,
            isPending,
          },
        },
      }
    }),
  closeAllOverlays: () => set({ order: [], items: {} }),
}))
