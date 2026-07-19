import { create } from 'zustand'

interface CommentQuoteState {
  pendingQuote: string | null
  setPendingQuote: (text: string) => void
  clearPendingQuote: () => void
}

export const useCommentQuoteStore = create<CommentQuoteState>((set) => ({
  pendingQuote: null,
  setPendingQuote: (text) => set({ pendingQuote: text }),
  clearPendingQuote: () => set({ pendingQuote: null }),
}))
