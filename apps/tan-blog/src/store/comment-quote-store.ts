import { create } from 'zustand'

type PendingQuote = {
  id: number
  text: string
}

interface CommentQuoteState {
  pendingQuote: PendingQuote | null
  setPendingQuote: (text: string) => void
  clearPendingQuote: () => void
}

let nextQuoteId = 0

export const useCommentQuoteStore = create<CommentQuoteState>((set) => ({
  pendingQuote: null,
  setPendingQuote: (text) => set({ pendingQuote: { id: ++nextQuoteId, text } }),
  clearPendingQuote: () => set({ pendingQuote: null }),
}))
