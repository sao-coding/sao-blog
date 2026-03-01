'use client'

import { useEffect, useRef, useState, MutableRefObject } from 'react'

export function useMeasuredHeight<
  T extends HTMLElement = HTMLElement
>(options?: {
  observe?: boolean
  debounce?: number
  onChange?: (height: number | null) => void
}): { ref: MutableRefObject<T | null>; height: number | null } {
  const { observe = true, debounce = 0, onChange } = options || {}
  const ref = useRef<T | null>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let mounted = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const measure = () => {
      if (!ref.current) return
      const h = ref.current.offsetHeight || null
      if (mounted) {
        setHeight(h)
        onChange?.(h)
      }
    }

    measure()

    if (!observe) return

    const ro = new ResizeObserver(() => {
      const update = () => {
        const h = ref.current?.offsetHeight || null
        if (mounted) {
          setHeight(h)
          onChange?.(h)
        }
      }
      if (debounce > 0) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(update, debounce)
      } else {
        update()
      }
    })

    ro.observe(el)

    return () => {
      mounted = false
      if (timer) clearTimeout(timer)
      ro.disconnect()
    }
  }, [observe, debounce, onChange])

  return { ref, height }
}
