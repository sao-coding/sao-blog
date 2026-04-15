'use client'

import { useEffect, useState } from 'react'
import NumberFlow from '@number-flow/react'

type Props = {
  className?: string
  value: number
  suffix?: string
}

const ProgressNumber = ({ value, suffix, className }: Props) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const timer = setTimeout(() => {
      setDisplayValue(value)
    }, 5)

    return () => clearTimeout(timer)
  }, [value])

  if (!mounted) return null

  return (
    <NumberFlow
      className={className}
      value={displayValue}
      suffix={suffix}
    />
  )
}

export default ProgressNumber