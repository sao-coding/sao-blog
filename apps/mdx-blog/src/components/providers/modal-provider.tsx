"use client"

import React, { createContext, useCallback, useMemo } from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { OverlayItem, OverlayType } from "@/store/modal-store"
import { useModalStackStore } from "@/store/modal-store"

interface CurrentOverlayContextValue {
  id: string
  type: OverlayType
  close: () => void
}

export const CurrentOverlayContext = createContext<CurrentOverlayContextValue | null>(null)

const renderOverlay = (item: OverlayItem, close: () => void) =>
  typeof item.content === "function"
    ? item.content({ close, id: item.id, type: item.kind })
    : item.content

const OverlayDialog = ({ item, zIndex }: { item: OverlayItem; zIndex: number }) => {
  const dismiss = useModalStackStore((state) => state.dismiss)
  const close = useCallback(() => dismiss(item.id), [item.id, dismiss])
  const content = renderOverlay(item, close)

  if (item.kind !== "dialog") return null

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={item.showCloseButton ?? true}
        className={cn(item.className)}
        style={{ zIndex }}
      >
        {(item.title || item.description) && (
          <DialogHeader>
            {item.title ? <DialogTitle>{item.title}</DialogTitle> : null}
            {item.description ? (
              <DialogDescription>{item.description}</DialogDescription>
            ) : null}
          </DialogHeader>
        )}
        <CurrentOverlayContext.Provider value={{ id: item.id, type: item.kind, close }}>
          {content}
        </CurrentOverlayContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

const OverlayDrawer = ({ item, zIndex }: { item: OverlayItem; zIndex: number }) => {
  const dismiss = useModalStackStore((state) => state.dismiss)
  const close = useCallback(() => {
    dismiss(item.id)
  }, [item.id, dismiss])
  const content = renderOverlay(item, close)

  if (item.kind !== "drawer") return null

  return (
    <Drawer direction={item.direction} open onOpenChange={(next) => !next && close()}>
      <DrawerContent className={cn(item.className)} style={{ zIndex }}>
        {(item.title || item.description) && (
          <DrawerHeader>
            {item.title ? <DrawerTitle>{item.title}</DrawerTitle> : null}
            {item.description ? (
              <DrawerDescription>{item.description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
        )}
        <CurrentOverlayContext.Provider value={{ id: item.id, type: item.kind, close }}>
          {content}
        </CurrentOverlayContext.Provider>
      </DrawerContent>
    </Drawer>
  )
}

interface ModalProviderProps {
  /** 起始 z-index，越大的 stack 會依序疊加。 */
  baseZIndex?: number
}

/**
 * 全域 Overlay Provider，負責將 Zustand 堆疊渲染成 Dialog / Drawer。
 */
export const ModalProvider: React.FC<React.PropsWithChildren<ModalProviderProps>> = ({
  baseZIndex = 60,
  children,
}) => {
  const stack = useModalStackStore((state) => state.stack)

  return (
    <>
      {children}
      {stack.map((item, index) => {
        const zIndex = baseZIndex + index
        return item.kind === "dialog" ? (
          <OverlayDialog key={item.id} item={item} zIndex={zIndex} />
        ) : (
          <OverlayDrawer key={item.id} item={item} zIndex={zIndex} />
        )
      })}
    </>
  )
}
