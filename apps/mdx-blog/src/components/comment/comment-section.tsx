/**
 * 留言區主元件
 *
 * 整合留言表單、留言列表、排序、按讚/倒讚、回覆等功能。
 * 支援 lazyLoad 參數控制是否在快滑到留言區時才載入。
 * 顯示留言數與回覆數統計。
 *
 * 注意：目前後端接口未實現，使用模擬資料。
 * 與後端交互相關代碼已在相關位置注明「後端對接待補充」。
 *
 * @module components/comment/comment-section
 */

'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useInView } from 'motion/react'
import { MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { Comment, CommentSortOrder, VoteType } from '@/types/comment'
import type { CommentFormValues } from '@/schemas/comment'
import { cn } from '@/lib/utils'
import { countCommentsAndReplies } from './constants'
import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface CommentSectionProps {
  /** 文章或頁面 ID（用於後端對接） */
  postId: string
  /** 是否啟用延遲載入（快滑到時才載入） */
  lazyLoad?: boolean
  /** 額外的 className */
  className?: string
}

/**
 * 生成唯一 ID
 * @returns 唯一 ID 字串
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 留言區主元件
 *
 * 功能包含：
 * - 留言表單（支援 Markdown、Emoji）
 * - 留言列表（支援排序、按讚、倒讚、回覆）
 * - 留言/回覆統計
 * - 可選的延遲載入
 *
 * @param props - 留言區屬性
 * @returns 留言區元件
 */
export function CommentSection({
  postId,
  lazyLoad = false,
  className,
}: CommentSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sentinelRef, { once: true, margin: '200px' })

  // 如果啟用 lazyLoad 且尚未進入視野，只渲染哨兵元素
  const shouldRender = !lazyLoad || isInView

  return (
    <div ref={sentinelRef} className={cn('w-full', className)}>
      {shouldRender ? (
        <CommentSectionContent postId={postId} />
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <MessageCircleIcon className="mr-2 size-4" />
          載入留言區中...
        </div>
      )}
    </div>
  )
}

/**
 * 留言區核心內容元件
 *
 * 管理留言資料狀態、投票狀態、排序等。
 * 後端對接待補充：目前所有操作均為前端本地狀態操作。
 */

function CommentSectionContent({ postId }: { postId: string }) {
  // 後端對接待補充：改為從 API 獲取留言資料，使用 postId 作為查詢參數
  // const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [sortOrder, setSortOrder] = useState<CommentSortOrder>('newest')
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()


  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comments?postId=${postId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch comments')
      }
      const data = await res.json()
      return data.data
    }
  })

  /** 計算留言與回覆統計 */
  const { commentsCount, repliesCount } = useMemo(
    () => countCommentsAndReplies(comments),
    [comments]
  )

  /**
   * 遞迴地在留言樹中新增回覆
   * @param commentsList - 留言陣列
   * @param parentId - 父留言 ID
   * @param newReply - 新回覆
   * @returns 更新後的留言陣列
   */
  const addReplyToTree = useCallback(
    (commentsList: Comment[], parentId: string, newReply: Comment): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, newReply],
          }
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToTree(comment.replies, parentId, newReply),
          }
        }
        return comment
      })
    },
    []
  )

  /**
   * 遞迴地更新留言樹中指定留言的投票數
   * @param commentsList - 留言陣列
   * @param commentId - 留言 ID
   * @param field - 要更新的欄位
   * @param delta - 變化量
   * @returns 更新後的留言陣列
   */
  const updateVoteInTree = useCallback(
    (
      commentsList: Comment[],
      commentId: string,
      field: 'likes' | 'dislikes',
      delta: number
    ): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            [field]: Math.max(0, comment[field] + delta),
          }
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateVoteInTree(comment.replies, commentId, field, delta),
          }
        }
        return comment
      })
    },
    []
  )

  /**
   * 送出新留言
   * 後端對接待補充：改為呼叫 API 新增留言
   */
  const handleSubmitComment = useCallback(
    async (data: CommentFormValues) => {
      setIsSubmitting(true)

      try {
        // 後端對接待補充：呼叫 API 新增留言

        const newComment: Comment = {
          id: generateId(),
          displayUsername: data.displayUsername,
          email: data.email,
          website: data.website || undefined,
          content: data.content,
          createdAt: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          replies: [],
          parentId: null,
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newComment, postId }),
        })


        // setComments((prev) => [newComment, ...prev])
        toast.success('留言已送出！')
      } catch {
        toast.error('送出失敗，請稍後再試')
      } finally {
        setIsSubmitting(false)
      }
    },
    [/* 後端對接待補充：加入 _postId */]
  )

  /**
   * 送出回覆
   * 後端對接待補充：改為呼叫 API 新增回覆
   */
  // const handleReply = useCallback(
  //   async (parentId: string, data: CommentFormValues) => {
  //     try {
  //       // 後端對接待補充：呼叫 API 新增回覆
  //       // const response = await fetch(`/api/comments/${parentId}/replies`, {
  //       //   method: 'POST',
  //       //   headers: { 'Content-Type': 'application/json' },
  //       //   body: JSON.stringify({ ...data, postId }),
  //       // })

  //       const res = await fetch(`/api/comments/${parentId}/replies`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ ...data, postId }),
  //       })

  //       const newReply: Comment = {
  //         id: generateId(),
  //         displayUsername: data.displayUsername,
  //         email: data.email,
  //         website: data.website || undefined,
  //         content: data.content,
  //         createdAt: new Date().toISOString(),
  //         likes: 0,
  //         dislikes: 0,
  //         replies: [],
  //         parentId,
  //       }

  //       // setComments((prev) => addReplyToTree(prev, parentId, newReply))

  //       queryClient.invalidateQueries({ queryKey: ['comments', postId] })


  //       toast.success('回覆已送出！')
  //     } catch {
  //       toast.error('回覆失敗，請稍後再試')
  //     }
  //   },
  //   [addReplyToTree]
  // )

  const { mutate } =  useMutation({
    mutationFn: async ({ parentId, data }: { parentId: string; data: CommentFormValues }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comments/${parentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, postId }),
      })
      if (!res.ok) {
        throw new Error('Failed to submit reply')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success('回覆已送出！')
    }
  })

  const handleReply = (parentId: string, data: CommentFormValues) => {
    mutate({ parentId, data })
  }

/**
 * 處理按讚
 * 後端對接待補充：改為呼叫 API 更新按讚
 */
const handleLike = useCallback(
  (commentId: string) => {
    const currentVote = userVotes[commentId] ?? null

    setUserVotes((prev) => {
      if (currentVote === 'like') {
        // 取消按讚
        return { ...prev, [commentId]: null }
      }
      return { ...prev, [commentId]: 'like' }
    })

    setComments((prev) => {
      let updated = prev

      if (currentVote === 'like') {
        // 取消按讚：likes -1
        updated = updateVoteInTree(updated, commentId, 'likes', -1)
      } else {
        // 新增按讚：likes +1
        updated = updateVoteInTree(updated, commentId, 'likes', 1)
        if (currentVote === 'dislike') {
          // 原本是倒讚，先取消倒讚：dislikes -1
          updated = updateVoteInTree(updated, commentId, 'dislikes', -1)
        }
      }

      return updated
    })
  },
  [userVotes, updateVoteInTree]
)

/**
 * 處理倒讚
 * 後端對接待補充：改為呼叫 API 更新倒讚
 */
const handleDislike = useCallback(
  (commentId: string) => {
    const currentVote = userVotes[commentId] ?? null

    setUserVotes((prev) => {
      if (currentVote === 'dislike') {
        // 取消倒讚
        return { ...prev, [commentId]: null }
      }
      return { ...prev, [commentId]: 'dislike' }
    })

    setComments((prev) => {
      let updated = prev

      if (currentVote === 'dislike') {
        // 取消倒讚：dislikes -1
        updated = updateVoteInTree(updated, commentId, 'dislikes', -1)
      } else {
        // 新增倒讚：dislikes +1
        updated = updateVoteInTree(updated, commentId, 'dislikes', 1)
        if (currentVote === 'like') {
          // 原本是按讚，先取消按讚：likes -1
          updated = updateVoteInTree(updated, commentId, 'likes', -1)
        }
      }

      return updated
    })
  },
  [userVotes, updateVoteInTree]
)

return (
  <div className="space-y-6 mt-12">
    {/* 標題與統計 */}
    <div className="flex items-center gap-2">
      <MessageCircleIcon className="size-5 text-foreground" />
      <h2 className="text-lg font-semibold text-foreground">留言區</h2>
      <span className="text-sm text-muted-foreground">
        {commentsCount} 則留言
        {repliesCount > 0 && ` · ${repliesCount} 則回覆`}
      </span>
    </div>

    {/* 留言表單 */}
    <CommentForm onSubmit={handleSubmitComment} isSubmitting={isSubmitting} />

    {/* 留言列表 */}
    <CommentList
      comments={comments}
      sortOrder={sortOrder}
      onSortChange={setSortOrder}
      userVotes={userVotes}
      onLike={handleLike}
      onDislike={handleDislike}
      onReply={handleReply}
    />
  </div>
)
}
