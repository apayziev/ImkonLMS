import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export function AnimatedNumber({
  value,
  duration = 500,
  className = "",
  suffix = "",
  prefix = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  // Tracks the currently-rendered value so a value change mid-animation
  // resumes from where we are (not from the last *completed* value).
  const currentValueRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = currentValueRef.current
    const endValue = value
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function - ease out cubic
      const easeOut = 1 - (1 - progress) ** 3

      const currentValue = Math.round(
        startValue + (endValue - startValue) * easeOut,
      )
      setDisplayValue(currentValue)
      currentValueRef.current = currentValue

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}
