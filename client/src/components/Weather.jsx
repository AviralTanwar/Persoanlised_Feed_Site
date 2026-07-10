import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import useCountUp from '../hooks/useCountUp'
import './Weather.css'

// Built entirely from theme tokens (see THEME_COLORS.md) - named accents shift
// between Mocha/Latte palettes so each tile stays legible whichever theme is active.
const COND = {
  Clear:        { bg: 'linear-gradient(145deg, var(--yellow), var(--peach))',  dark: true  },
  Haze:         { bg: 'linear-gradient(145deg, var(--ov1), var(--s1))',        dark: false },
  Clouds:       { bg: 'linear-gradient(145deg, var(--sub0), var(--ov0))',      dark: false },
  Rain:         { bg: 'linear-gradient(145deg, var(--blue), var(--mauve))',    dark: false },
  Drizzle:      { bg: 'linear-gradient(145deg, var(--teal), var(--blue))',     dark: false },
  Snow:         { bg: 'linear-gradient(145deg, var(--text), var(--sub0))',     dark: true  },
  Thunderstorm: { bg: 'linear-gradient(145deg, var(--crust), var(--mauve))',   dark: false },
  Mist:         { bg: 'linear-gradient(145deg, var(--teal), var(--ov1))',      dark: false },
  Smoke:        { bg: 'linear-gradient(145deg, var(--s1), var(--ov1))',        dark: false },
}

const ICONS = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Snow: '❄️', Thunderstorm: '⛈️', Haze: '🌫️', Mist: '🌁', Smoke: '🌫️',
}


function WeatherTile({ city, country, removable, onRemove }) {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const tileRef = useRef()

  useEffect(() => {
    fetch(`/api/weather?city=${encodeURIComponent(city)}&country=${country}&units=metric`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [city, country])

  const temp = useCountUp(data?.main?.temp ?? 0)
  const cond  = data?.weather?.[0]?.main ?? 'Clear'
  const style = COND[cond] ?? COND.Clear
  const tc    = style.dark ? 'var(--crust)' : 'var(--text2)'
  const dim   = style.dark
    ? 'color-mix(in srgb, var(--crust) 75%, transparent)'
    : 'color-mix(in srgb, var(--text2) 75%, transparent)'

  function onMouseMove(e) {
    const el = tileRef.current
    const r  = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top)  / r.height
    el.style.setProperty('--rx', `${((px - 0.5) * 8).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(-(py - 0.5) * 8).toFixed(2)}deg`)
  }
  function onMouseLeave() {
    tileRef.current.style.setProperty('--rx', '0deg')
    tileRef.current.style.setProperty('--ry', '0deg')
  }

  if (loading) return (
    <div className="wtile wtile-state">
      <div className="wtile-spinner" />
      <span>Loading {city}…</span>
    </div>
  )
  if (error) return (
    <div className="wtile wtile-state wtile-error">⚠️ {city}: {error}</div>
  )

  return (
    <div
      ref={tileRef}
      className="wtile"
      style={{ background: style.bg, color: tc }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {removable && (
        <button className="wtile-rm" onClick={onRemove} title="Remove city">✕</button>
      )}
      <div className="wtile-top">
        <div>
          <div className="wtile-city">{data.name}</div>
          <div className="wtile-sub" style={{ color: dim }}>{cond}</div>
        </div>
        <span className="wtile-ico">{ICONS[cond] ?? '🌡️'}</span>
      </div>
      <div className="wtile-temp">{Math.round(temp)}°<span>C</span></div>
      <div className="wtile-stats">
        {[
          ['🌡️', 'Feels',    `${Math.round(data.main.feels_like)}°`],
          ['💧', 'Humidity', `${data.main.humidity}%`],
          ['💨', 'Wind',     `${data.wind.speed} m/s`],
          ['📊', 'H / L',   `${Math.round(data.main.temp_max)}° / ${Math.round(data.main.temp_min)}°`],
        ].map(([ico, lbl, val]) => (
          <div key={lbl} className="wtile-stat">
            <span style={{ color: dim }}>{ico} {lbl}</span>
            <span className="wtile-val">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Weather() {
  const [cities,      setCities]      = useState([])
  const [maxCities,   setMaxCities]   = useState(6)
  const [suggestions, setSuggestions] = useState([])
  const [picking, setPicking] = useState(false)
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState(null)

  function load() {
    fetch('/api/weather-cities')
      .then(r => r.json())
      .then(data => {
        if (data && data.cities) {
          setCities(data.cities)
          setMaxCities(data.max ?? 6)
          setSuggestions(data.suggestions ?? [])
        } else if (Array.isArray(data)) {
          setCities(data)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const canAdd    = cities.length < maxCities
  const available = suggestions.filter(e => !cities.some(c => c.city === e.city))

  async function addCity(c) {
    setError(null)
    setAdding(true)
    try {
      const res  = await fetch('/api/weather-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: c.city, country: c.country, units: 'metric' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add city')
      setCities(cs => [...cs, data])
      setPicking(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  function removeCity(id) {
    setCities(cs => cs.filter(c => c.id !== id)) // optimistic - DB soft-deletes (sets deleted_at)
    fetch(`/api/weather-cities/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <Card>
      <SectionHeader
        icon="🌤️"
        title="Weather"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip color="var(--peach)" small>{cities.length} cities</Chip>
            {canAdd && (
              <button
                className={`btn-g${picking ? ' on' : ''}`}
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={() => setPicking(v => !v)}
              >
                + Add city
              </button>
            )}
          </div>
        }
      />

      {/* City picker - drops inline below header when open */}
      {picking && (
        <div className="wcity-picker">
          <span className="wcity-picker-lbl">Select a city to add:</span>
          {error && <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠️ {error}</span>}
          <div className="wcity-picker-grid">
            {available.length === 0
              ? <span style={{ color: 'var(--ov0)', fontSize: 12 }}>No more cities available</span>
              : available.map(c => (
                  <button key={c.city} className="wpick-btn" disabled={adding} onClick={() => addCity(c)}>
                    {c.city}
                  </button>
                ))
            }
          </div>
          <button className="btn-g" style={{ fontSize: 11, alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      )}

      <div className="wgrid">
        {cities.map(c => (
          <WeatherTile
            key={c.id}
            city={c.city}
            country={c.country}
            removable={!c.permanent}
            onRemove={() => removeCity(c.id)}
          />
        ))}
      </div>
    </Card>
  )
}
