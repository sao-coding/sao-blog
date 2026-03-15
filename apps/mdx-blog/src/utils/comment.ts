import { FlatComment, Comment, CommentRefType } from "@/types/comment"

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
      email: item.email,
      website: item.website ?? undefined,
      content: item.content,
      createdAt: new Date(item.createdAt).toISOString(),
      liked: item.liked,   // ✅
      likes: item.likes,
      dislikes: item.dislikes,
      replies: [],
      parentId: item.thread,
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

  return roots
}