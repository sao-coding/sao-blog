// 首頁筆跡的顏料與工具（DESIGN.md 第 5 節）：墨、朱，加幾種國畫顏料（畫得出樹幹、葉子、苔），讀者在首屏的提示那一行選。
// 顏料存在讀者自己的瀏覽器，存不了（隱私模式、被擋）就用墨。顏色是 token（styles.css 的 --pigment-*），畫布建立時讀進來。
// 橡皮擦（登入的人才有，只擦得到自己留在紙上的）不存：每次進首頁都是筆。
import { useSyncExternalStore } from 'react'

/** 排法：墨與赭墨（枝幹）、赭石、藤黃、汁綠與石綠（葉、苔）、花青、朱 */
export const PIGMENTS = ['mo', 'zhemo', 'zheshi', 'tenghuang', 'zhilu', 'shilu', 'huaqing', 'zhu'] as const
export type Pigment = (typeof PIGMENTS)[number]

export const PIGMENT_VAR: Record<Pigment, string> = {
  mo: 'var(--foreground)',
  zhemo: 'var(--pigment-zhemo)',
  zheshi: 'var(--pigment-zheshi)',
  tenghuang: 'var(--pigment-tenghuang)',
  zhilu: 'var(--pigment-zhilu)',
  shilu: 'var(--pigment-shilu)',
  huaqing: 'var(--pigment-huaqing)',
  zhu: 'var(--zhu)',
}

export type Tool = 'brush' | 'eraser'

const KEY = 'brush-pigment'
const EVENT = 'brush-pigment-change'

let current: Pigment | null = null
let tool: Tool = 'brush'

export function getPigment(): Pigment {
  if (current) return current
  try {
    const v = localStorage.getItem(KEY)
    current = (PIGMENTS as readonly string[]).includes(v ?? '') ? (v as Pigment) : 'mo'
  } catch {
    current = 'mo'
  }
  return current
}

/** 選顏料也會換回筆 */
export function setPigment(p: Pigment) {
  current = p
  tool = 'brush'
  try {
    if (p === 'mo') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, p)
  } catch {
    // 存不了就只在這次瀏覽有效
  }
  window.dispatchEvent(new Event(EVENT))
}

export function getTool(): Tool {
  return tool
}

export function setTool(t: Tool) {
  tool = t
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

/** 伺服器上一律是墨；hydration 後才換成讀者存的 */
export function usePigment(): Pigment {
  return useSyncExternalStore(subscribe, getPigment, () => 'mo')
}

export function useTool(): Tool {
  return useSyncExternalStore(subscribe, getTool, () => 'brush')
}
