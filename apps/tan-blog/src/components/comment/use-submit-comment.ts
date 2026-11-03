import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { toast } from '@sao-blog/ui/components/toast'
import type { CommentFormValues } from '@/schemas/comment'
import { orpc } from '@/lib/orpc'
import { resolveRefType } from '@/utils/comment'
import { m } from '#/paraglide/messages'
import type { CommentGuardFields } from './comment-form'

/**
 * 送出留言 / 回覆：文末的留言區與讀到一半開的留言對話框（comment-dialog.tsx）共用。
 * API 用 status: "error" 回報限流、驗證失敗、文章關閉留言等狀況（不會 throw），依回應顯示訊息；回傳 true 時表單才清空。
 */
export function useSubmitComment(postId: string) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const refType = resolveRefType(pathname)
  const queryClient = useQueryClient()
  const queryKey = orpc.comment.getComments.key({ input: { type: refType, refId: postId } })
  const mutation = useMutation(orpc.comment.createComment.mutationOptions())

  const submit = async (data: CommentFormValues, guard: CommentGuardFields, thread?: string) => {
    try {
      const res = await mutation.mutateAsync({
        type: refType,
        refId: postId,
        content: data.content,
        thread,
        hp: guard.hp,
        turnstileToken: guard.turnstileToken,
      })
      if (res.status !== 'success') {
        toast.add({ title: res.message || m.comment_send_failed(), type: 'error' })
        return false
      }
      await queryClient.invalidateQueries({ queryKey })
      const pending = 'data' in res && res.data?.status === 'pending'
      toast.add({
        title: pending ? m.comment_sent_pending() : m.comment_sent(),
        description: pending ? m.comment_sent_pending_description() : undefined,
        type: 'success',
      })
      return true
    } catch {
      toast.add({ title: m.comment_send_failed(), type: 'error' })
      return false
    }
  }

  return { submit, isSubmitting: mutation.isPending }
}
