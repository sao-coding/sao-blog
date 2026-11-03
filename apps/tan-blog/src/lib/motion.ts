// 動態 token（DESIGN.md 第 7 節）：JS 端從這裡拿，CSS 端是 styles.css :root 的同名變數。
// 兩邊必須一致，motion.test.ts 會比對；改數值時兩處一起改。

/** 毫秒 */
export const DURATION = {
  /** 舊頁暈開、淡掉 */
  out: 200,
  /** 新頁每行收乾、移入 */
  in: 340,
  /** 錨字移到新位置 */
  move: 480,
  /** 新頁從第幾毫秒開始出字 */
  inDelay: 110,
} as const

/** 新頁各行錯開的間隔（毫秒）：第 STAGGER_MAX_LINES + 1 行以後一起出 */
export const STAGGER = 24
export const STAGGER_MAX_LINES = 8

/** 順著方向的位移（px）：舊頁移出、新頁移入，橫向與上下各一 */
export const SHIFT = { outX: 10, outY: 6, inX: 12, inY: 6 } as const

/** 墨暈的模糊（px）：舊頁 0 → out、新頁 in → 0 */
export const BLUR = { out: 5, in: 4 } as const

/** 同時模糊的行數上限，再往下的行只淡入、位移 */
export const BLUR_MAX_LINES = 9

/** cubic-bezier 的四個控制點，framer-motion 的 ease 直接吃陣列 */
export const EASE = {
  out: [0.2, 0.7, 0.2, 1],
  move: [0.6, 0, 0.2, 1],
} as const

/** 減少動態效果：只淡入淡出 */
export const REDUCED_DURATION = { out: 150, in: 200 } as const

/** framer-motion 的 transition（秒）：收乾、移入用 in，退場用 out，移位用 move。不用 spring，不另開彈性曲線 */
export const TRANSITION = {
  in: { duration: DURATION.in / 1000, ease: EASE.out },
  out: { duration: DURATION.out / 1000, ease: 'easeIn' },
  move: { duration: DURATION.move / 1000, ease: EASE.move },
} as const

export const cubicBezier = (p: readonly number[]) => `cubic-bezier(${p.join(', ')})`

/** CSS 變數名 → 值，motion.test.ts 拿來比對 styles.css */
export const MOTION_CSS_VARS: Record<string, string> = {
  '--dur-out': `${DURATION.out}ms`,
  '--dur-in': `${DURATION.in}ms`,
  '--dur-move': `${DURATION.move}ms`,
  '--stagger': `${STAGGER}ms`,
  '--ease-out': cubicBezier(EASE.out),
  '--ease-move': cubicBezier(EASE.move),
  '--dur-in-delay': `${DURATION.inDelay}ms`,
  '--dur-fade-out': `${REDUCED_DURATION.out}ms`,
  '--dur-fade-in': `${REDUCED_DURATION.in}ms`,
  '--shift-out-x': `${SHIFT.outX}px`,
  '--shift-out-y': `${SHIFT.outY}px`,
  '--shift-in-x': `${SHIFT.inX}px`,
  '--shift-in-y': `${SHIFT.inY}px`,
  '--blur-out': `${BLUR.out}px`,
  '--blur-in': `${BLUR.in}px`,
}
