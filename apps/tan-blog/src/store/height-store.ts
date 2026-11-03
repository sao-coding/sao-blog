import { create } from 'zustand'

interface HeightState {
  height: number | null
  setHeight: (height: number | null) => void
}

export const useHeightStore = create<HeightState>((set) => ({
  height: null,
  setHeight: (height) => set({ height }),
}))
