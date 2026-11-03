import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@sao-blog/ui/components/responsive-dialog'
import { m } from '#/paraglide/messages'
import { CommentSectionContent } from '@/components/comment/comment-section'

/**
 * 讀到一半就能看留言、寫留言（2026-11-02 站主要的）：整個留言區放進彈窗——桌機置中的對話框、手機從底部拉起（responsive-dialog）。
 * 跟文末的留言區是同一份資料（同一個 query），在這裡寫的留言回到文末也看得到。
 * 文章的閱讀數只認文末的留言區（post-client-page 的 viewSentinelRef），這裡不算。
 */
export function CommentDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl">
        {/* 標題由留言區自己寫，這裡只給螢幕閱讀器 */}
        <ResponsiveDialogTitle className="sr-only">{m.comment_section_title()}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">{m.comment_section_subtitle()}</ResponsiveDialogDescription>
        <ResponsiveDialogBody className="max-h-[78dvh] overflow-y-auto px-5 pb-8 sm:max-h-[80vh]">
          {open && <CommentSectionContent postId={postId} className="mt-2" titleId="comment-dialog-title" />}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
