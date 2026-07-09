import { useState, useEffect, useRef } from 'react'
import useLocalStorage from './hooks/useLocalStorage'

import SideNav      from './components/layout/SideNav'
import Hero         from './components/Hero'
import QuoteBanner  from './components/QuoteBanner'
import Weather      from './components/Weather'
import News         from './components/News'
import OneNote      from './components/OneNote'
import YouTube      from './components/YouTube'
import WebPages     from './components/WebPages'
import Improvements from './components/Improvements'
import YearKPI      from './components/YearKPI'
import ToDo         from './components/ToDo'

import './App.css'

const DEFAULT_TWEAKS = { accent: 'peach', density: 'compact', clock: '24h' }
const ACCENT_KEYS    = ['blue', 'mauve', 'peach', 'teal']
// Same hues, but the light variants are saturated enough to read on a light
// background — the dark-mode pastels (e.g. peach #fab387) fail contrast there.
const ACCENT_PALETTE = {
  dark:  { blue: '#89b4fa', mauve: '#cba6f7', peach: '#fab387', teal: '#94e2d5' },
  light: { blue: '#1e66f5', mauve: '#8839ef', peach: '#fe640b', teal: '#179299' },
}

// Fallback order used until /api/view-kpis responds
const DEFAULT_VIEW_KPIS = [
  { id: 1, name: 'Web Pages',    description: 'Web page viewer with notes', rank: 1 },
  { id: 2, name: 'YouTube',      description: 'YouTube video viewer with notes', rank: 2 },
  { id: 3, name: 'Improvements', description: 'Goal and improvement tracker', rank: 3 },
]

export default function App() {
  const [theme,  setTheme]  = useLocalStorage('theme',  'dark')
  const [tweaks, setTweaks] = useLocalStorage('tweaks', DEFAULT_TWEAKS)
  const [navOpen, setNavOpen]           = useState(false)
  const [activeSection, setActiveSection] = useState('weather')
  const [tweaksOpen, setTweaksOpen]     = useState(false)
  const [excuses, setExcuses]           = useState([])
  const [viewKpis, setViewKpis]         = useState(DEFAULT_VIEW_KPIS)
  const sectionRefs = useRef({})

  // ── Load excuses ──
  useEffect(() => {
    fetch('/api/static/excuses').then(r => r.json()).then(setExcuses)
  }, [])

  // ── Load view KPI order + names ──
  useEffect(() => {
    fetch('/api/view-kpis').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length) setViewKpis(d)
    }).catch(() => {})
  }, [])

  // ── Apply theme to <html> ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Apply tweaks as CSS vars ──
  useEffect(() => {
    const key = ACCENT_KEYS.includes(tweaks.accent) ? tweaks.accent : 'peach'
    document.documentElement.style.setProperty('--accent', ACCENT_PALETTE[theme][key])
    const v = tweaks.density === 'compact' ? '.75rem' : '1.2rem'
    const h = tweaks.density === 'compact' ? '.9rem'  : '1.4rem'
    document.documentElement.style.setProperty('--cp-v', v)
    document.documentElement.style.setProperty('--cp-h', h)
  }, [tweaks, theme])

  // ── Aurora mouse parallax ──
  useEffect(() => {
    let raf
    function onMove(e) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth  - 0.5) * 40
        const dy = (e.clientY / window.innerHeight - 0.5) * 40
        document.documentElement.style.setProperty('--ax', `${dx.toFixed(1)}px`)
        document.documentElement.style.setProperty('--ay', `${dy.toFixed(1)}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  // ── Scroll reveal ──
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal')]
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target) } })
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => obs.observe(el))
    const fallback = setTimeout(() => els.forEach(el => el.classList.add('in')), 1600)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [])

  // ── Scroll spy ──
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) setActiveSection(en.target.id) })
    }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 })
    Object.values(sectionRefs.current).forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // ── Esc closes nav ──
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  function scrollTo(id) {
    const el = sectionRefs.current[id]
    if (el) {
      setActiveSection(id)
      setNavOpen(false)
      window.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
    }
  }

  function setRef(id) { return el => { sectionRefs.current[id] = el } }
  function setTweak(key, val) { setTweaks(t => ({ ...t, [key]: val })) }
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  function renderViewSection(kpi) {
    if (kpi.id === 1) return (
      <section key={kpi.id} id="webpages" className="sec reveal" ref={setRef('webpages')}>
        <WebPages viewKpi={kpi} />
      </section>
    )
    if (kpi.id === 2) return (
      <section key={kpi.id} id="youtube" className="sec reveal" ref={setRef('youtube')}>
        <YouTube viewKpi={kpi} />
      </section>
    )
    if (kpi.id === 3) return (
      <section key={kpi.id} id="improvements" className="sec reveal" ref={setRef('improvements')}>
        <Improvements viewKpi={kpi} />
      </section>
    )
    return null
  }

  return (
    <div className="shell">
      {/* ── Backgrounds ── */}
      <div className="aurora-wrap" aria-hidden="true"><div className="aurora" /></div>
      <div className="grid-overlay" aria-hidden="true" />

      {/* ── Navigation ── */}
      <SideNav
        active={activeSection}
        onNav={scrollTo}
        open={navOpen}
        onToggle={() => setNavOpen(o => !o)}
        clock={tweaks.clock}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* ── Tweaks button ── */}
      <button className="tweaks-btn" onClick={() => setTweaksOpen(v => !v)} title="Tweaks">⚙️</button>

      {/* ── Tweaks panel ── */}
      {tweaksOpen && (
        <div className="tweaks-panel">
          <div className="tweaks-hdr">
            <span>Tweaks</span>
            <button className="btn-i" onClick={() => setTweaksOpen(false)}>✕</button>
          </div>

          <div className="tweaks-sec">
            <div className="tweaks-lbl">Accent Color</div>
            <div className="tweaks-swatches">
              {ACCENT_KEYS.map(a => (
                <button
                  key={a}
                  className={`swatch${tweaks.accent === a ? ' on' : ''}`}
                  style={{ background: ACCENT_PALETTE[theme][a] }}
                  onClick={() => setTweak('accent', a)}
                />
              ))}
            </div>
          </div>

          <div className="tweaks-sec">
            <div className="tweaks-lbl">Density</div>
            <div className="tweaks-pills">
              {['comfortable', 'compact'].map(d => (
                <button key={d} className={`btn-g${tweaks.density === d ? ' on' : ''}`} style={{ fontSize: 11 }}
                  onClick={() => setTweak('density', d)}>{d}</button>
              ))}
            </div>
          </div>

          <div className="tweaks-sec">
            <div className="tweaks-lbl">Clock Format</div>
            <div className="tweaks-pills">
              {['12h', '24h'].map(f => (
                <button key={f} className={`btn-g${tweaks.clock === f ? ' on' : ''}`} style={{ fontSize: 11 }}
                  onClick={() => setTweak('clock', f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="content">
        {/* Year KPI */}
        <div className="reveal"><YearKPI /></div>

        {/* Hero band */}
        <div className="hero-band reveal">
          <Hero clock={tweaks.clock} />
          <QuoteBanner excuses={excuses} />
        </div>

        {/* Weather */}
        <section id="weather" className="sec reveal" ref={setRef('weather')}>
          <Weather />
        </section>

        {/* News */}
        <section id="news" className="sec reveal" ref={setRef('news')}>
          <News techRef={setRef('tech')} />
        </section>

        {/* To-Do */}
        <section id="todo" className="sec reveal" ref={setRef('todo')}>
          <ToDo />
        </section>

        {/* Web Pages / YouTube / Improvements — ordered by tbl_view_kpi.rank */}
        {viewKpis.map(renderViewSection)}

        {/* OneNote */}
        <section id="notes" className="sec reveal" ref={setRef('notes')}>
          <OneNote />
        </section>
      </main>
    </div>
  )
}
