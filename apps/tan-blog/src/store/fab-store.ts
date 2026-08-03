import { create } from 'zustand'

interface FABStore {
  /** FABContainer 的 DOM 節點 */
  containerElement: HTMLDivElement | null
  /** 設定 FABContainer 的 DOM 節點 */
  setContainerElement: (el: HTMLDivElement | null) => void
}

/**
 * FAB 容器 Store
 *
 * 儲存 `FABContainer` 的 DOM 節點引用，
 * 供 `FABPortable` 透過 `createPortal` 將按鈕注入到容器中。
 */
export const useFABStore = create<FABStore>((set) => ({
  containerElement: null,
  setContainerElement: (el) => set({ containerElement: el }),
}))
