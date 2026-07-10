import { useState, useEffect, useRef } from 'react'
import useTime from '../hooks/useTime'
import './Hero.css'

export default function Hero({ clock }) {
  const ref = useRef()
  const now = useTime()
  const [userInfo, setUserInfo] = useState({ location: 'Noida, India', timezone: 'IST (UTC+5:30)' })

  useEffect(() => {
    fetch('/api/user-info')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setUserInfo(d) })
      .catch(() => {})
  }, [])

  const hr = now.getHours()
  const greeting =
    hr < 5  ? 'Burning the midnight oil' :
    hr < 12 ? 'Good morning' :
    hr < 17 ? 'Good afternoon' :
    hr < 21 ? 'Good evening' :
              'Working late'

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: clock === '12h',
  })
  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' })
  const rest    = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

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
    <div className="hero-card" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="hero-greet">
        <span className="live-dot" />
        {greeting} · Live
      </div>
      <span className="hero-scanline" aria-hidden="true" />
      <div className="hero-date">
        {weekday},<br />{rest}
      </div>
      <div className="hero-time">{timeStr}</div>
      <div className="hero-sub">
        {userInfo.location || 'Noida, India'} · {userInfo.timezone || 'IST (UTC+5:30)'}
      </div>
    </div>
  )
}
