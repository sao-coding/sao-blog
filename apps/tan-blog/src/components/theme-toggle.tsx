import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { m } from '#/paraglide/messages'

// 頁尾的「晝／夜讀」切換：預設晝（宣紙淺色），夜讀為深色。
// 主題在 <head> 的 THEME_INIT_SCRIPT 就已套用；按鈕文字等 hydration 後才依實際主題顯示，避免不一致。
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={m.theme_toggle()}
      title={m.theme_toggle()}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-wenkai text-sm text-muted-foreground transition-colors hover:border-ink/50 hover:text-ink"
    >
      {isDark ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
      {isDark ? m.theme_night() : m.theme_day()}
    </button>
  )
}
