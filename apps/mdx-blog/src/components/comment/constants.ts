/**
 * 留言區常數與工具函式
 * @module components/comment/constants
 */

import type { Comment } from '@/types/comment'

/** 隨機 placeholder 陣列，每次渲染時隨機選取一個作展示 */
export const COMMENT_PLACEHOLDERS: string[] = [
  '寫下你的想法...',
  '留下你的評論吧！',
  '分享你的觀點...',
  '有什麼想說的嗎？',
  '歡迎留言討論 ✍️',
  '你的意見很重要！',
  '說點什麼吧...',
  '在這裡留下你的足跡...',
  '來聊聊你的看法吧！',
  '期待你的想法 💡',
]

/**
 * 從 placeholder 陣列中隨機選取一個
 * @returns 隨機 placeholder 字串
 */
export function getRandomPlaceholder(): string {
  return COMMENT_PLACEHOLDERS[
    Math.floor(Math.random() * COMMENT_PLACEHOLDERS.length)
  ]
}

/** localStorage key：用於記住使用者身份 */
export const COMMENT_USER_STORAGE_KEY = 'comment-user-identity'

/**
 * 計算留言與回覆總數
 * @param comments - 留言陣列
 * @returns 留言數與回覆數
 */
export function countCommentsAndReplies(comments: Comment[]): {
  commentsCount: number
  repliesCount: number
} {
  const commentsCount = comments.length
  let repliesCount = 0

  function countReplies(replies: Comment[]) {
    repliesCount += replies.length
    for (const reply of replies) {
      countReplies(reply.replies)
    }
  }

  for (const comment of comments) {
    countReplies(comment.replies)
  }

  return { commentsCount, repliesCount }
}

/** 開發用模擬留言資料（後端對接待補充） */
export const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    displayUsername: '小明',
    email: 'xiaoming@example.com',
    content:
      '這篇文章寫得真好！\n\n特別喜歡 **程式碼範例** 的部分，解說得很清楚。\n\n- 重點一：架構說明\n- 重點二：實作細節\n- 重點三：效能優化',
    createdAt: '2026-02-20T10:30:00Z',
    likes: 5,
    dislikes: 0,
    replies: [
      {
        id: '1-1',
        displayUsername: '小華',
        email: 'xiaohua@example.com',
        website: 'https://example.com',
        content: '同意！特別是 `useEffect` 的說明很清楚。',
        createdAt: '2026-02-20T11:00:00Z',
        likes: 2,
        dislikes: 0,
        replies: [],
        parentId: '1',
      },
      {
        id: '1-2',
        displayUsername: '小美',
        email: 'xiaomei@example.com',
        content: '我也覺得！已收藏 📚',
        createdAt: '2026-02-20T12:30:00Z',
        likes: 1,
        dislikes: 0,
        replies: [
            {
                id: '1-2-1',
                displayUsername: '小強',
                email: 'xiaoqiang@example.com',
                content: '感謝分享！這篇文章對我幫助很大。',
                createdAt: '2026-02-20T13:00:00Z',
                likes: 1,
                dislikes: 0,
                replies: [
                    {
                        id: '1-2-1-1',
                        displayUsername: '小美',
                        email: 'xiaomei@example.com',
                        content: '不客氣！很高興對你有幫助 😊',
                        createdAt: '2026-02-20T13:30:00Z',
                        likes: 1,
                        dislikes: 0,
                        replies: [
                            {
                                id: '1-2-1-1-1',
                                displayUsername: '小強',
                                email: 'xiaoqiang@example.com',
                                content: '感謝分享！這篇文章對我幫助很大。',
                                createdAt: '2026-02-20T14:00:00Z',
                                likes: 1,
                                dislikes: 0,
                                replies: [],
                                parentId: '1-2-1-1',
                            },
                        ],
                        parentId: '1-2-1',
                    },
                ],
                parentId: '1-2',
            },
            {
                id: '1-2-2',
                displayUsername: '小剛',
                email: 'xiaogang@example.com',
                content: '這篇文章很有幫助！感謝分享！',
                createdAt: '2026-02-20T15:00:00Z',
                likes: 1,
                dislikes: 0,
                replies: [],
                parentId: '1-2',
            },
            {
                id: '1-2-3',
                displayUsername: '小美',
                email: 'xiaomei@example.com',
                content: '感謝分享！這篇文章對我幫助很大！',
                createdAt: '2026-02-20T16:00:00Z',
                likes: 1,
                dislikes: 0,
                replies: [],
                parentId: '1-2',
            },
            {
                id: '1-2-4',
                displayUsername: '小強',
                email: 'xiaoqiang@example.com',
                content: '感謝分享！這篇文章對我幫助很大！',
                createdAt: '2026-02-20T17:00:00Z',
                likes: 1,
                dislikes: 0,
                replies: [],
                parentId: '1-2',
            },
        ],
        parentId: '1',
      },
    ],
    parentId: null,
  },
  {
    id: '2',
    displayUsername: 'John',
    email: 'john@example.com',
    website: 'https://example.com',
    content:
      'Great article! Here is a code example:\n\n```typescript\nconst greeting = (name: string): string => {\n  return `Hello, ${name}!`\n}\n\nconsole.log(greeting("World"))\n```\n\nVery helpful for beginners!',
    createdAt: '2026-02-19T15:00:00Z',
    likes: 3,
    dislikes: 1,
    replies: [],
    parentId: null,
  },
  {
    id: '3',
    displayUsername: '阿杰',
    email: 'ajie@example.com',
    content:
      '想請問一下，這個做法和 ~~傳統方式~~ 相比有什麼優勢？\n\n| 特性 | 傳統方式 | 新方式 |\n|------|---------|--------|\n| 效能 | 普通 | 優秀 |\n| 維護性 | 困難 | 容易 |',
    createdAt: '2026-02-18T09:15:00Z',
    likes: 8,
    dislikes: 0,
    replies: [],
    parentId: null,
  },
  {
    id: '4',
    displayUsername: '小芳',
    email: 'xiaofang@example.com',
    content: '這篇文章對我幫助很大！感謝分享！',
    createdAt: '2026-02-18T10:30:00Z',
    likes: 5,
    dislikes: 0,
    replies: [],
    parentId: null,
  },
]
