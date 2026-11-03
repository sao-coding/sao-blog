import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@sao-blog/ui/components/toast'
import { orpc } from '@/lib/orpc'
import { authClient } from '@/lib/auth-client'
import { m } from '#/paraglide/messages'

export type Reader = { id: string; name: string; image: string | null }
export type StampState = { likes: number; liked: boolean; readers: Reader[] }

/**
 * 蓋印（原本的按讚，API 還是 post.getLikes／likePost）：只有登入的讀者能蓋，再按一次取消。
 * 詳情頁是 ISR 快取，印數、自己蓋過沒、最近蓋印的讀者都由 client 另外抓。
 */
export function useStamps(postId: string) {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const queryOptions = orpc.post.getLikes.queryOptions({ input: { id: postId } })
  const cacheKey = queryOptions.queryKey
  const me = session?.user

  const { data } = useQuery({
    ...queryOptions,
    select: (res): StampState | null => (res.status === 'success' ? res.data : null),
  })

  // 登入狀態改變時重抓（liked 取決於使用者）
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: cacheKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  const mutation = useMutation({
    ...orpc.post.likePost.mutationOptions(),
    // 先在畫面上蓋下去（自己的印排到最前面），失敗再退回
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cacheKey })
      const previous = queryClient.getQueryData(cacheKey)
      queryClient.setQueryData(cacheKey, (old) => {
        if (old?.status !== 'success' || !me) return old
        const liked = !old.data.liked
        const others = old.data.readers.filter((r) => r.id !== me.id)
        return {
          ...old,
          data: {
            liked,
            likes: old.data.likes + (liked ? 1 : -1),
            readers: liked ? [{ id: me.id, name: me.name, image: me.image ?? null }, ...others] : others,
          },
        }
      })
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

  return {
    state: data ?? null,
    me: me ? { id: me.id, name: me.name, image: me.image ?? null } : null,
    toggle: () => me && mutation.mutate({ id: postId }),
  }
}
