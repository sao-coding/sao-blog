'use client'

import { type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sao-blog/ui/components/alert-dialog'
import { Button } from '@sao-blog/ui/components/button'
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@sao-blog/ui/components/responsive-dialog'
import { useOverlayStore } from '@/stores/overlay-store'

interface OverlayProviderProps {
  children: ReactNode
}

function OverlayViewport() {
  const order = useOverlayStore((state) => state.order)
  const items = useOverlayStore((state) => state.items)
  const closeOverlay = useOverlayStore((state) => state.closeOverlay)
  const setPending = useOverlayStore((state) => state.setPending)

  return (
    <>
      {order.map((id) => {
        const item = items[id]
        if (!item) {
          return null
        }

        const close = () => closeOverlay(id)

        const renderResult = item.render({
          close,
          isPending: item.isPending,
        })

        const handleCancel = () => {
          item.onCancel?.({ close, isPending: item.isPending })
          closeOverlay(id)
        }

        const handleConfirm = async () => {
          if (!item.onConfirm) {
            closeOverlay(id)
            return
          }

          try {
            setPending(id, true)
            await item.onConfirm({ close, isPending: true })
          } finally {
            setPending(id, false)
          }
        }

        if (item.kind === 'alert-dialog') {
          return (
            <AlertDialog
              key={id}
              open={item.isOpen}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  handleCancel()
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{renderResult.title}</AlertDialogTitle>
                  {renderResult.description ? (
                    <AlertDialogDescription>
                      {renderResult.description}
                    </AlertDialogDescription>
                  ) : null}
                  {renderResult.body}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {renderResult.hideCancel ? null : (
                    <AlertDialogCancel
                      disabled={item.isPending}
                      onClick={handleCancel}
                    >
                      {renderResult.cancelLabel ?? '取消'}
                    </AlertDialogCancel>
                  )}
                  {renderResult.hideConfirm ? null : (
                    <AlertDialogAction
                      variant={renderResult.confirmVariant ?? 'default'}
                      disabled={item.isPending || renderResult.confirmDisabled}
                      onClick={handleConfirm}
                    >
                      {renderResult.confirmLabel ?? '確認'}
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }

        // 一般對話框（多半是表單）：桌面置中、手機從底部拉起
        const hasFooter = !renderResult.hideCancel || !renderResult.hideConfirm
        return (
          <ResponsiveDialog
            key={id}
            open={item.isOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                handleCancel()
              }
            }}
          >
            <ResponsiveDialogContent showCloseButton={!item.isPending}>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{renderResult.title}</ResponsiveDialogTitle>
                {renderResult.description ? (
                  <ResponsiveDialogDescription>{renderResult.description}</ResponsiveDialogDescription>
                ) : null}
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody>{renderResult.body}</ResponsiveDialogBody>
              {hasFooter && (
                <ResponsiveDialogFooter>
                  {renderResult.hideCancel ? null : (
                    <Button
                      variant="outline"
                      disabled={item.isPending}
                      onClick={handleCancel}
                    >
                      {renderResult.cancelLabel ?? '取消'}
                    </Button>
                  )}
                  {renderResult.hideConfirm ? null : (
                    <Button
                      variant={renderResult.confirmVariant ?? 'default'}
                      disabled={item.isPending || renderResult.confirmDisabled}
                      onClick={handleConfirm}
                    >
                      {renderResult.confirmLabel ?? '確認'}
                    </Button>
                  )}
                </ResponsiveDialogFooter>
              )}
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        )
      })}
    </>
  )
}

export function OverlayProvider({ children }: OverlayProviderProps) {
  return (
    <>
      {children}
      <OverlayViewport />
    </>
  )
}
