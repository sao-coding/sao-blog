// 首頁 ⇄ 列表的推近／拉遠（DESIGN.md 第 5 節）。畫面上的 2D 部分在 components/ink-push.tsx，
// 3D 鏡頭在 components/ink-voyage.ts；兩邊用 window 事件溝通，3D 沒載入（低階裝置、SVG 山水）時只有 2D 那一層。

export const DOLLY_EVENT = 'ink-voyage:dolly'

export interface DollyDetail {
  to: number
  ms: number
}

export function dollyVoyage(to: number, ms: number) {
  window.dispatchEvent(new CustomEvent<DollyDetail>(DOLLY_EVENT, { detail: { to, ms } }))
}

// 從列表拉遠回首頁：首頁的 3D 要等載入、主執行緒空下來才建立，所以先記下來，建好時從推近的位置拉回
let pullOutAt = 0
export function requestPullOut() {
  pullOutAt = performance.now()
}
export function consumePullOut() {
  const pending = pullOutAt > 0 && performance.now() - pullOutAt < 5000
  pullOutAt = 0
  return pending
}
