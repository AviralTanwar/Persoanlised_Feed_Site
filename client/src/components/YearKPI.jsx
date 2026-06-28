import './YearKPI.css'

function statusColor(pctLeft) {
  if (pctLeft < 10) return 'var(--red)'
  if (pctLeft < 30) return 'var(--peach)'
  if (pctLeft < 90) return 'var(--yellow)'
  return 'var(--green)'
}

export default function YearKPI() {
  const now       = new Date()
  const year      = now.getFullYear()
  const start     = new Date(year, 0, 1)
  const end       = new Date(year + 1, 0, 1)
  const total     = Math.round((end - start) / 86400000)
  const dayOfYear = Math.floor((now - start) / 86400000) + 1
  const daysLeft  = total - dayOfYear
  const pctLeft   = (daysLeft / total) * 100
  const pctFilled = (dayOfYear / total) * 100

  const color = statusColor(pctLeft)

  return (
    <div className="ykpi-card">
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
