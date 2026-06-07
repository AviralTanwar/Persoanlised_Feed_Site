import { useState, useEffect } from 'react'

export default function useCountUp(end, duration = 1100) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf
    let startTime
    const target = Number(end) || 0
    const ease = t => 1 - Math.pow(1 - t, 3)

    function tick(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      setValue(target * ease(progress))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])

  return value
}
