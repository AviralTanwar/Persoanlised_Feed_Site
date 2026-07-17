import { useState, useEffect, useRef } from 'react'
import './QuoteBanner.css'

const MOT_FALLBACK = [
  { author: 'Steve Jobs',       quote: 'Innovation distinguishes between a leader and a follower.' },
  { author: 'Peter Drucker',    quote: 'The best way to predict the future is to create it.' },
  { author: 'Confucius',        quote: 'It does not matter how slowly you go as long as you do not stop.' },
  { author: 'Albert Einstein',  quote: 'A person who never made a mistake never tried anything new.' },
  { author: 'Aristotle',        quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.' },
]

const DEV_FALLBACK = [
  'It works on my machine.',
  "That's weird… it worked yesterday.",
  "It must be a hardware problem.",
  "The cache must be stale - try a hard refresh.",
  "It's not a bug, it's an undocumented feature.",
]

async function fetchQuote(type) {
  try {
    const res = await fetch(`/api/quotes?type=${type}`)
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (!d?.quote) throw new Error()
    return d
  } catch {
    if (type === 'motivational') return MOT_FALLBACK[Math.floor(Math.random() * MOT_FALLBACK.length)]
    return { quote: DEV_FALLBACK[Math.floor(Math.random() * DEV_FALLBACK.length)], author: 'developerexcuses.com' }
  }
}

export default function QuoteBanner() {
  const ref = useRef()
  const [excuse,    setExcuse]    = useState(null)
  const [quote,     setQuote]     = useState(null)
  const [excuseFade,  setExcuseFade]  = useState(true)
  const [quoteFade,   setQuoteFade]   = useState(true)
  const [loading,   setLoading]   = useState(true)

  async function loadBoth() {
    const [dev, mot] = await Promise.all([fetchQuote('developer'), fetchQuote('motivational')])
    setExcuse(dev)
    setQuote(mot)
    setLoading(false)
    setExcuseFade(true)
    setQuoteFade(true)
  }

  function shuffle() {
    setExcuseFade(false)
    setQuoteFade(false)
    setTimeout(loadBoth, 200)
  }

  useEffect(() => { loadBoth() }, [])
  useEffect(() => {
    const id = setInterval(shuffle, 12000)
    return () => clearInterval(id)
  }, [])

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
        <div className="quote-txt" style={{ opacity: (excuseFade && !loading) ? 1 : 0.35 }}>
          {loading ? 'Loading excuse…' : `"${excuse?.quote ?? ''}"`}
        </div>
        <div className="quote-src">- {excuse?.author || 'developerexcuses.com'}</div>
      </div>

      <div className="quote-div" />

      <div className="quote-block">
        <div className="quote-label mot">✦ Motivational Spark</div>
        <div className="quote-txt" style={{ opacity: (quoteFade && !loading) ? 1 : 0.35 }}>
          {loading ? 'Summoning some motivation…' : `"${quote?.quote ?? ''}"`}
        </div>
        <div className="quote-src">- {quote?.author ?? '…'}</div>
      </div>

      <div className="quote-foot">
        <button className="btn-g" onClick={shuffle}>🎲 Shuffle both</button>
      </div>
    </div>
  )
}
