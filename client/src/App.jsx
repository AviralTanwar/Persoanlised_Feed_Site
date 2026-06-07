import { useState, useEffect, useRef } from 'react'
import useLocalStorage from './hooks/useLocalStorage'

import SideNav      from './components/layout/SideNav'
import Hero         from './components/Hero'
import QuoteBanner  from './components/QuoteBanner'
import Weather      from './components/Weather'
import NationalNews from './components/NationalNews'
import TechNews     from './components/TechNews'
import OneNote      from './components/OneNote'
import YouTube      from './components/YouTube'
import Improvements from './components/Improvements'

import './App.css'

const DEFAULT_TWEAKS = { accent: '#fab387', density: 'compact', clock: '24h' }
const ACCENT_OPTS    = ['#89b4fa', '#cba6f7', '#fab387', '#94e2d5']

export default function App() {
  const [theme,  setTheme]  = useLocalStorage('theme',  'dark')
  const [tweaks, setTweaks] = useLocalStorage('tweaks', DEFAULT_TWEAKS)
  const [navOpen, setNavOpen]           = useState(false)
  const [activeSection, setActiveSection] = useState('weather')
  const [tweaksOpen, setTweaksOpen]     = useState(false)
  const [excuses, setExcuses]           = useState([])
  const sectionRefs = useRef({})

  // ── Load excuses ──
  useEffect(() => {
    fetch('/api/static/excuses').then(r => r.json()).then(setExcuses)
  }, [])

  // ── Apply theme to <html> ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Apply tweaks as CSS vars ──
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent)
    const v = tweaks.density === 'compact' ? '.75rem' : '1.2rem'
    const h = tweaks.density === 'compact' ? '.9rem'  : '1.4rem'
    document.documentElement.style.setProperty('--cp-v', v)
    document.documentElement.style.setProperty('--cp-h', h)
  }, [tweaks])

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
              {ACCENT_OPTS.map(a => (
                <button
                  key={a}
                  className={`swatch${tweaks.accent === a ? ' on' : ''}`}
                  style={{ background: a }}
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
        {/* Hero band */}
        <div className="hero-band reveal">
          <Hero clock={tweaks.clock} />
          <QuoteBanner excuses={excuses} />
        </div>

        {/* Weather */}
        <section id="weather" className="sec reveal" ref={setRef('weather')}>
          <Weather />
        </section>

        {/* News row */}
        <section id="news" className="sec reveal" ref={setRef('news')}>
          <div className="newsrow">
            <NationalNews />
            <div id="tech" ref={setRef('tech')} style={{ scrollMarginTop: '1rem' }}>
              <TechNews />
            </div>
          </div>
        </section>

        {/* OneNote */}
        <section id="notes" className="sec reveal" ref={setRef('notes')}>
          <OneNote />
        </section>

        {/* YouTube */}
        <section id="youtube" className="sec reveal" ref={setRef('youtube')}>
          <YouTube />
        </section>

        {/* Improvements */}
        <section id="improvements" className="sec reveal" ref={setRef('improvements')}>
          <Improvements />
        </section>
      </main>
    </div>
  )
}
