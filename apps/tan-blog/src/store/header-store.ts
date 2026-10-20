// 若是在文章頁面
// 狀態有
// - 文章分類
// - 文章標籤
// - 文章標題
// - 文章URL

// 若是在筆記頁面
// - 筆記專欄(分類)
// - 筆記標題
// - 筆記URL
import { create } from 'zustand'

interface HeaderState {
  postState: {
    category: string | null
    tags: string[]
    title: string | null
    url: string | null
  }
  noteState: {
    topic: string | null
    title: string | null
    url: string | null
  }
  setPostState: (postState: HeaderState['postState']) => void
  setNoteState: (noteState: HeaderState['noteState']) => void
  clearPostState: () => void
  clearNoteState: () => void
  clearAll: () => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
  postState: {
    category: null,
    tags: [],
    title: null,
    url: null,
  },
  noteState: {
    topic: null,
    title: null,
    url: null,
  },
  setPostState: (postState) => set({ postState }),
  setNoteState: (noteState) => set({ noteState }),
  clearPostState: () =>
    set({
      postState: {
        category: null,
        tags: [],
        title: null,
        url: null,
      },
    }),
  clearNoteState: () =>
    set({
      noteState: {
        topic: null,
        title: null,
        url: null,
      },
    }),
  clearAll: () =>
    set({
      postState: {
        category: null,
        tags: [],
        title: null,
        url: null,
      },
      noteState: {
        topic: null,
        title: null,
        url: null,
      },
    }),
}))
