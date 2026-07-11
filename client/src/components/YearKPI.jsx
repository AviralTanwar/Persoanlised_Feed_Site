import { useRef, useState, useEffect } from 'react'
import useTime from '../hooks/useTime'
import './YearKPI.css'

function statusColor(pctLeft) {
  if (pctLeft < 10) return 'var(--red)'
  if (pctLeft < 30) return 'var(--peach)'
  if (pctLeft < 90) return 'var(--yellow)'
  return 'var(--green)'
}

export default function YearKPI() {
  const ref = useRef()
  const now = useTime()
  const [tzInfo, setTzInfo] = useState({ tz_sign: '+', tz_offset: '5:30' })

  useEffect(() => {
    fetch('/api/user-info')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setTzInfo(d) })
      .catch(() => {})
  }, [])

  // Apply stored UTC offset — same formula as Hero.jsx
  const [offH, offM] = (tzInfo.tz_offset || '5:30').split(':').map(Number)
  const sign   = tzInfo.tz_sign === '-' ? -1 : 1
  const tzNow  = new Date(now.getTime() + sign * (offH * 60 + (offM || 0)) * 60000)

  // All date arithmetic using UTC methods on the offset-adjusted instant
  const year      = tzNow.getUTCFullYear()
  const start     = new Date(Date.UTC(year, 0, 1))
  const end       = new Date(Date.UTC(year + 1, 0, 1))
  const total     = Math.round((end - start) / 86400000)
  const dayOfYear = Math.floor((tzNow - start) / 86400000) + 1
  const daysLeft  = total - dayOfYear
  const pctLeft   = (daysLeft / total) * 100
  const pctFilled = (dayOfYear / total) * 100
  const color     = statusColor(pctLeft)

  function onMouseMove(e) {
    const el = ref.current
    const r  = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top)  / r.height
    el.style.setProperty('--rx', `${((px - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(-(py - 0.5) * 7).toFixed(2)}deg`)
  }
  function onMouseLeave() {
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="ykpi-card" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="ykpi-stat ykpi-stat--left">
        <span className="ykpi-num" style={{ color }}>{daysLeft}</span>
        <span className="ykpi-unit">days remaining</span>
      </div>

      <div className="ykpi-mid">
        <div className="ykpi-title">Year progress - {year}</div>
        <div className="ykpi-bar-track">
          <div className="ykpi-bar-fill" style={{ width: `${pctFilled}%`, background: color }} />
        </div>
        <div className="ykpi-bar-labels">
          <span>Day {dayOfYear}</span>
          <span>{total} days total</span>
        </div>
      </div>

      <div className="ykpi-stat ykpi-stat--right">
        <span className="ykpi-num" style={{ color }}>{pctLeft.toFixed(1)}<span className="ykpi-pct-sym">%</span></span>
        <span className="ykpi-unit">of year left</span>
      </div>
    </div>
  )
}
