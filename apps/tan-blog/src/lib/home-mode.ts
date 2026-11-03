// 首頁的樣子：筆跡（預設）、水面或素面，讀者在 footer 切換（DESIGN.md 第 5 節）。
// 存在讀者自己的瀏覽器；存不了（隱私模式、被擋）就用預設的筆跡。
// 減少動態效果時：水面（會自己動）換成素面；筆跡照常（墨只跟著讀者的手出現），只是不寫示範的那一筆。
// 水面建立 WebGL2 失敗時也退回素面（筆跡只用 2D，不受影響）。
// 實際用哪一種也寫在 <html data-home-view> 上（water／plain；筆跡不標）：<head> 的 HOME_MODE_INIT_SCRIPT 在第一次繪製前就標好，
// 首頁的版面由 CSS 依它排，水面、素面的讀者不會先看到筆跡的版面再變過去。
import { useSyncExternalStore } from 'react'

export type HomeMode = 'brush' | 'water' | 'plain'

const KEY = 'home-mode'
const EVENT = 'home-mode-change'
const REDUCE = '(prefers-reduced-motion: reduce)'

export const HOME_MODE_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem('${KEY}');if(v==='water'&&matchMedia('${REDUCE}').matches)v='plain';if(v==='plain'||v==='water')document.documentElement.dataset.homeView=v}catch(e){}})();`

function read(): HomeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'plain' || v === 'water' ? v : 'brush'
  } catch {
    return 'brush'
  }
}

/** 這台裝置畫不了水面（建立 WebGL2 失敗）：這次瀏覽選水面的都用素面 */
let noWater = false

function readView(): HomeMode {
  const mode = read()
  if (mode === 'water' && (noWater || matchMedia(REDUCE).matches)) return 'plain'
  return mode
}

function sync() {
  const root = document.documentElement
  const view = readView()
  if (view === 'brush') delete root.dataset.homeView
  else root.dataset.homeView = view
  window.dispatchEvent(new Event(EVENT))
}

export function setHomeMode(mode: HomeMode) {
  try {
    if (mode === 'brush') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // 存不了就維持筆跡
  }
  sync()
}

export function markNoWater() {
  noWater = true
  sync()
}

function subscribe(onChange: () => void) {
  const mq = matchMedia(REDUCE)
  // 別的分頁改了、或系統的減少動態效果切了：重新標 <html>，sync 再發 EVENT 通知
  const resync = () => sync()
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', resync)
  mq.addEventListener('change', resync)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', resync)
    mq.removeEventListener('change', resync)
  }
}

/** 讀者選的（footer 的開關用）。伺服器上一律是筆跡；hydration 後才換成讀者存的 */
export function useHomeMode(): HomeMode {
  return useSyncExternalStore(subscribe, read, () => 'brush')
}

/** 首頁實際用的：讀者選的，再加上減少動態效果、水面建不起來時自動素面 */
export function useHomeView(): HomeMode {
  return useSyncExternalStore(subscribe, readView, () => 'brush')
}
