"use client"

import * as React from "react"
import { cn } from "@sao-blog/ui/lib/utils"
import { useIsMobile } from "@sao-blog/ui/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sao-blog/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@sao-blog/ui/components/drawer"

// 響應式對話框：桌面（≥768px）是置中的 Dialog，手機是從底部拉起的 Drawer。
// 做法同 https://ui.shadcn.com/docs/components/base/drawer#responsive ，
// 包成一組 compound component，使用端只寫一次結構、不用自己判斷裝置。
//
// <ResponsiveDialog open={open} onOpenChange={setOpen}>
//   <ResponsiveDialogContent>
//     <ResponsiveDialogHeader>
//       <ResponsiveDialogTitle>標題</ResponsiveDialogTitle>
//       <ResponsiveDialogDescription>說明</ResponsiveDialogDescription>
//     </ResponsiveDialogHeader>
//     <ResponsiveDialogBody>內容（手機上可捲動）</ResponsiveDialogBody>
//     <ResponsiveDialogFooter>按鈕</ResponsiveDialogFooter>
//   </ResponsiveDialogContent>
// </ResponsiveDialog>

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({ isMobile: false })

const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext)

interface ResponsiveDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const Root = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerTrigger {...(props as React.ComponentProps<typeof DrawerTrigger>)} />
  ) : (
    <DialogTrigger {...props} />
  )
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerClose {...(props as React.ComponentProps<typeof DrawerClose>)} />
  ) : (
    <DialogClose {...props} />
  )
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string
  children: React.ReactNode
  /** 桌面版右上角的關閉鈕；手機版用往下滑或點背景關閉 */
  showCloseButton?: boolean
}) {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) {
    return (
      <DrawerContent className={cn("pb-[env(safe-area-inset-bottom)]", className)}>
        <div aria-hidden className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        {children}
      </DrawerContent>
    )
  }
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn("max-h-[calc(100dvh-4rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg", className)}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerHeader className={cn("text-left", className)} {...props} />
  ) : (
    <DialogHeader className={cn("pr-8", className)} {...props} />
  )
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerTitle {...(props as React.ComponentProps<typeof DrawerTitle>)} />
  ) : (
    <DialogTitle {...props} />
  )
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerDescription {...(props as React.ComponentProps<typeof DrawerDescription>)} />
  ) : (
    <DialogDescription {...props} />
  )
}

/** 內容區：內容太長時在這裡捲動，header / footer 固定 */
function ResponsiveDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()
  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn(isMobile ? "min-h-0 flex-1 overflow-y-auto px-4 py-4" : "-mx-4 min-h-0 overflow-y-auto px-4", className)}
      {...props}
    />
  )
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerFooter className={cn("border-t pt-4", className)} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  useResponsiveDialog,
}
