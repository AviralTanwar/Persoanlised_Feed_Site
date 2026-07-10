import { useState, useEffect, useRef } from 'react'
import './QuoteBanner.css'

const MOT_FALLBACK = [
  { author: 'Steve Jobs',       quote: 'Innovation distinguishes between a leader and a follower.' },
  { author: 'Peter Drucker',    quote: 'The best way to predict the future is to create it.' },
  { author: 'Confucius',        quote: 'It does not matter how slowly you go as long as you do not stop.' },
  { author: 'Albert Einstein',  quote: 'A person who never made a mistake never tried anything new.' },
  { author: 'Aristotle',        quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.' },
]

// Proxied through Express so the URL stays in server/.env (never in the bundle)
async function fetchMotivation() {
  try {
    const res = await fetch('/api/quotes')
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (d?.quote) return { author: d.author || 'Unknown', quote: d.quote }
    throw new Error()
  } catch {
    return MOT_FALLBACK[Math.floor(Math.random() * MOT_FALLBACK.length)]
  }
}

export default function QuoteBanner({ excuses }) {
  const ref = useRef()
  const [excuseIdx, setExcuseIdx] = useState(() => Math.floor(Math.random() * (excuses?.length || 1)))
  const [excuseFade, setExcuseFade] = useState(true)
  const [quote, setQuote] = useState(null)
  const [quoteFade, setQuoteFade] = useState(true)
  const [loading, setLoading] = useState(true)

  async function loadQuote() {
    const q = await fetchMotivation()
    setQuote(q)
    setLoading(false)
    setQuoteFade(true)
  }

  function shuffle() {
    setExcuseFade(false)
    setQuoteFade(false)
    setTimeout(() => {
      setExcuseIdx(i => ((i + 1) % (excuses?.length || 1)))
      setExcuseFade(true)
    }, 200)
    loadQuote()
  }

  useEffect(() => { loadQuote() }, [])
  useEffect(() => {
    const id = setInterval(shuffle, 12000)
    return () => clearInterval(id)
  }, [excuses])

  const excuse = excuses?.[excuseIdx] ?? '…'

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
    <div className="quote-card" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="quote-block">
        <div className="quote-label dev">⚡ Developer Excuse</div>
        <div className="quote-txt" style={{ opacity: excuseFade ? 1 : 0 }}>"{excuse}"</div>
        <div className="quote-src">- via developerexcuses.com</div>
      </div>

      <div className="quote-div" />

      <div className="quote-block">
        <div className="quote-label mot">✦ Motivational Spark</div>
        <div className="quote-txt" style={{ opacity: (quoteFade && !loading) ? 1 : 0.35 }}>
          {loading && !quote ? 'Summoning some motivation…' : `"${quote?.quote ?? ''}"`}
        </div>
        <div className="quote-src">- {quote?.author ?? '…'}</div>
      </div>

      <div className="quote-foot">
        <button className="btn-g" onClick={shuffle}>🎲 Shuffle both</button>
      </div>
    </div>
  )
}
