import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getSolarTerm, SEASON_REPRESENTATIVE_TERM, SEASON_STORAGE_KEY, SEASONS, type Season } from '@/lib/season'
import { TERM_THEMES } from '@/lib/term-themes'
import { m } from '#/paraglide/messages'

const SEASON_LABEL: Record<Season, () => string> = {
  spring: m.season_spring,
  summer: m.season_summer,
  autumn: m.season_autumn,
  winter: m.season_winter,
}

// 頁尾的「節氣・季節」與四季切換（呼應鳴潮玄方「四季巡迴之庭」可手動換季的玩法）。
// 預設跟著真實節氣（伺服器已寫在 <html data-season>）；訪客點別的季節只是預覽，
// 記在 localStorage，點回目前的季節即恢復跟隨真實時間。
export function SeasonSwitcher() {
  const now = getSolarTerm()
  const [active, setActive] = useState<Season>(now.season)

  // hydration 後再讀 <html data-season>（可能已被 SEASON_INIT_SCRIPT 換成訪客的選擇），
  // 避免 SSR 與 client 第一次 render 不一致
  useEffect(() => {
    const current = document.documentElement.dataset.season as Season | undefined
    if (current && SEASONS.includes(current)) setActive(current)
  }, [])

  const choose = (season: Season) => {
    setActive(season)
    // 點回目前季節＝恢復真實節氣；其他季節用該季的代表節氣預覽
    const term = season === now.season ? now.index : SEASON_REPRESENTATIVE_TERM[season]
    const root = document.documentElement
    root.dataset.season = season
    root.dataset.term = String(term)
    root.style.setProperty('--season', TERM_THEMES[term].accent)
    try {
      if (season === now.season) localStorage.removeItem(SEASON_STORAGE_KEY)
      else localStorage.setItem(SEASON_STORAGE_KEY, season)
    } catch {
      // 私密模式等情況寫不進去也沒關係，只是不會記住
    }
  }

  return (
    <div className="flex items-center gap-3 font-wenkai text-xs text-muted-foreground">
      <span>{m.season_now({ term: now.term, season: SEASON_LABEL[now.season]() })}</span>
      <div role="group" aria-label={m.season_switch()} className="flex items-center gap-1">
        {SEASONS.map((season) => {
          const isActive = season === active
          return (
            <button
              key={season}
              type="button"
              onClick={() => choose(season)}
              aria-pressed={isActive}
              title={m.season_preview({ season: SEASON_LABEL[season]() })}
              data-season={season}
              className={cn(
                'relative h-6 min-w-6 px-1 transition-colors',
                isActive ? 'text-[var(--season)]' : 'hover:text-foreground',
              )}
            >
              {SEASON_LABEL[season]()}
              {isActive && (
                <span className="absolute inset-x-1.5 -bottom-0.5 h-px rounded-full bg-[var(--season)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
