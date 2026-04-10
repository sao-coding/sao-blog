'use client'

import { useCallback } from 'react'
import {
  type OverlayRenderContext,
  type OverlayRenderFn,
  useOverlayStore,
} from '@/stores/overlay-store'

interface OpenOverlayOptions {
  id: string
  render: OverlayRenderFn
  onConfirm?: (context: OverlayRenderContext) => void | Promise<void>
  onCancel?: (context: OverlayRenderContext) => void
}

interface OpenOverlayWithGeneratedIdOptions {
  id?: string
  render: OverlayRenderFn
  onConfirm?: (context: OverlayRenderContext) => void | Promise<void>
  onCancel?: (context: OverlayRenderContext) => void
}

const createOverlayId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function useOverlay() {
  const openOverlay = useOverlayStore((state) => state.openOverlay)
  const closeOverlay = useOverlayStore((state) => state.closeOverlay)
  const closeAllOverlays = useOverlayStore((state) => state.closeAllOverlays)

  const openAlertDialog = useCallback(
    ({ id, render, onConfirm, onCancel }: OpenOverlayWithGeneratedIdOptions) => {
      const overlayId = id ?? createOverlayId('alert-dialog')

      openOverlay({
        id: overlayId,
        kind: 'alert-dialog',
        render,
        onConfirm,
        onCancel,
      })

      return overlayId
    },
    [openOverlay]
  )

  const openDialog = useCallback(
    ({ id, render, onConfirm, onCancel }: OpenOverlayWithGeneratedIdOptions) => {
      const overlayId = id ?? createOverlayId('dialog')

      openOverlay({
        id: overlayId,
        kind: 'dialog',
        render,
        onConfirm,
        onCancel,
      })

      return overlayId
    },
    [openOverlay]
  )

  const open = useCallback(
    ({ id, render, onConfirm, onCancel }: OpenOverlayOptions) => {
      openOverlay({
        id,
        kind: 'dialog',
        render,
        onConfirm,
        onCancel,
      })
    },
    [openOverlay]
  )

  return {
    open,
    openDialog,
    openAlertDialog,
    closeOverlay,
    closeAllOverlays,
  }
}
