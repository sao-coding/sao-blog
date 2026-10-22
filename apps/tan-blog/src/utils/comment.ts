import type { FlatComment, Comment, CommentRefType } from "@/types/comment"

export function resolveRefType(pathname: string): CommentRefType {
  if (pathname.includes('/notes/')) return 'note'
  return 'post'
}


export function toCommentTree(flatComments: FlatComment[]): Comment[] {
  const map = new Map<string, Comment>()
  const roots: Comment[] = []

  for (const item of flatComments) {
    map.set(item.id, {
      id: item.id,
      displayUsername: item.displayUsername,
      image: item.image,
      email: item.email,
      website: item.website ?? undefined,
      content: item.content,
      createdAt: new Date(item.createdAt).toISOString(),
      liked: item.liked,   // ✅
      likes: item.likes,
      dislikes: item.dislikes,
      location: item.location,
      replies: [],
      parentId: item.thread,
      pending: item.status === 'pending',
      userId: item.userId,
      pin: item.pin,
      deleted: item.deleted,
      isAuthor: item.isAuthor,
    })
  }

  for (const comment of map.values()) {
    if (!comment.parentId) {
      roots.push(comment)
      continue
    }

    const parent = map.get(comment.parentId)
    if (parent) {
      parent.replies.push(comment)
      continue
    }

    // Parent comment may be deleted or filtered out; keep orphan replies visible.
    roots.push(comment)
  }

  sortReplies(roots)
  return roots
}

/** 自己或底下任何一則回覆被置頂 */
export function hasPinned(comment: Comment): boolean {
  return comment.pin || comment.replies.some(hasPinned)
}

/**
 * 回覆串一律由舊到新（像對話一樣往下讀），置頂的回覆排在該串最前面。
 * API 回傳是新到舊，所以這裡要重排。
 */
function sortReplies(comments: Comment[]) {
  for (const comment of comments) {
    comment.replies.sort((a, b) => {
      const pa = hasPinned(a)
      if (pa !== hasPinned(b)) return pa ? -1 : 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    sortReplies(comment.replies)
  }
}