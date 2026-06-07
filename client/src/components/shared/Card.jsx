import { useRef } from 'react'

export default function Card({ children, style, className = '' }) {
  const ref = useRef()

  function onMouseMove(e) {
    const el = ref.current
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${((px - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(-(py - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
  }

  function onMouseLeave() {
    const el = ref.current
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--mx', '50%')
    el.style.setProperty('--my', '-30%')
  }

  return (
    <div
      ref={ref}
      className={`card ${className}`}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}
