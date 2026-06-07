import useTime from '../hooks/useTime'
import './Hero.css'

export default function Hero({ clock }) {
  const now = useTime()

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

  return (
    <div className="hero-card">
      <div className="hero-greet">
        <span className="live-dot" />
        {greeting} · Live
      </div>
      <div className="hero-date">
        {weekday},<br />{rest}
      </div>
      <div className="hero-time">{timeStr}</div>
      <div className="hero-sub">Noida, India · IST (UTC+5:30)</div>
    </div>
  )
}
