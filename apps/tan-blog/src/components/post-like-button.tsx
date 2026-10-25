import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartIcon } from 'lucide-react'
import { toast } from '@sao-blog/ui/components/toast'
import { orpc } from '@/lib/orpc'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { openLoginDialog } from '@/store/login-dialog-store'
import { m } from '#/paraglide/messages'

type LikeState = { likes: number; liked: boolean }

/**
 * 文章按讚：一顆朱色的圓印，按下填滿。
 * 詳情頁是 ISR 快取，讚數與「自己是否按過」由 client 另外抓；未登入按下時開登入對話框。
 */
export function PostLikeButton({ postId, className }: { postId: string; className?: string }) {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const queryOptions = orpc.post.getLikes.queryOptions({ input: { id: postId } })
  const cacheKey = queryOptions.queryKey
  const userId = session?.user.id

  const { data } = useQuery({
    ...queryOptions,
    select: (res): LikeState | null => (res.status === 'success' ? res.data : null),
  })

  // 登入狀態改變時重抓（liked 取決於使用者）
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: cacheKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const mutation = useMutation({
    ...orpc.post.likePost.mutationOptions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cacheKey })
      const previous = queryClient.getQueryData(cacheKey)
      queryClient.setQueryData(cacheKey, (old) =>
        old?.status === 'success'
          ? { ...old, data: { liked: !old.data.liked, likes: old.data.likes + (old.data.liked ? -1 : 1) } }
          : old
      )
      return { previous }
    },
    onSuccess: (res, _vars, context) => {
      if (res.status === 'success') return
      queryClient.setQueryData(cacheKey, context?.previous)
      toast.add({ title: res.message || m.comment_action_failed(), type: 'error' })
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(cacheKey, context?.previous)
      toast.add({ title: m.comment_action_failed(), type: 'error' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  })

  // API 還沒就緒（例如 migration 未跑）就不顯示，避免一顆按了會壞的鈕
  if (!data) return null

  const handleClick = () => {
    if (!session) return openLoginDialog()
    mutation.mutate({ id: postId })
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={data.liked}
        aria-label={data.liked ? m.post_liked() : m.post_like()}
        title={data.liked ? m.post_liked() : m.post_like()}
        className={cn(
          'group flex size-14 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90',
          data.liked
            ? 'border-ink bg-ink text-background'
            : 'border-dashed border-ink/50 text-ink hover:border-solid hover:bg-ink/10'
        )}
      >
        <HeartIcon
          key={String(data.liked)}
          className={cn('size-6', data.liked && 'comment-like-pop fill-current')}
        />
      </button>
      <span className="font-wenkai text-sm tabular-nums text-muted-foreground">{data.likes}</span>
    </div>
  )
}
