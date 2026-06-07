import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import useCountUp from '../hooks/useCountUp'
import useLocalStorage from '../hooks/useLocalStorage'
import './Weather.css'

const MAX_CITIES = 6

const COND = {
  Clear:        { bg: 'linear-gradient(145deg,#f9a825,#ffcc02,#ef6c00)', dark: true },
  Haze:         { bg: 'linear-gradient(145deg,#37474f,#546e7a)',          dark: false },
  Clouds:       { bg: 'linear-gradient(145deg,#607d8b,#90a4ae)',          dark: false },
  Rain:         { bg: 'linear-gradient(145deg,#1565c0,#42a5f5)',          dark: false },
  Drizzle:      { bg: 'linear-gradient(145deg,#1976d2,#64b5f6)',          dark: false },
  Snow:         { bg: 'linear-gradient(145deg,#b0bec5,#eceff1)',          dark: true  },
  Thunderstorm: { bg: 'linear-gradient(145deg,#212121,#424242)',          dark: false },
  Mist:         { bg: 'linear-gradient(145deg,#546e7a,#78909c)',          dark: false },
  Smoke:        { bg: 'linear-gradient(145deg,#455a64,#607d8b)',          dark: false },
}

const ICONS = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Snow: '❄️', Thunderstorm: '⛈️', Haze: '🌫️', Mist: '🌁', Smoke: '🌫️',
}

const EXTRA_CITIES = [
  { city: 'New Delhi',  country: 'IN' },
  { city: 'Gurugram',   country: 'IN' },
  { city: 'Bengaluru',  country: 'IN' },
  { city: 'Mumbai',     country: 'IN' },
  { city: 'Lucknow',    country: 'IN' },
  { city: 'Jaipur',     country: 'IN' },
  { city: 'Pune',       country: 'IN' },
  { city: 'Chandigarh', country: 'IN' },
  { city: 'Hyderabad',  country: 'IN' },
  { city: 'Kolkata',    country: 'IN' },
]

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
  const tc    = style.dark ? 'rgba(17,17,27,.88)' : '#eef0ff'
  const dim   = style.dark ? 'rgba(17,17,27,.6)'  : 'rgba(238,240,255,.7)'

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
  const [config, setConfig]   = useState(null)
  const [added, setAdded]     = useLocalStorage('weather_added', [])
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    fetch('/api/static/config').then(r => r.json()).then(setConfig)
  }, [])

  const baseCities = config?.weather ?? []
  const allCities  = [...baseCities, ...added]
  const canAdd     = allCities.length < MAX_CITIES
  const available  = EXTRA_CITIES.filter(e => !allCities.some(c => c.city === e.city))

  function addCity(c)    { setAdded(a => [...a, c]); setPicking(false) }
  function removeCity(n) { setAdded(a => a.filter(c => c.city !== n)) }

  return (
    <Card>
      <SectionHeader
        icon="🌤️"
        title="Weather"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip color="var(--peach)" small>{allCities.length} cities</Chip>
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

      {/* City picker — drops inline below header when open */}
      {picking && (
        <div className="wcity-picker">
          <span className="wcity-picker-lbl">Select a city to add:</span>
          <div className="wcity-picker-grid">
            {available.length === 0
              ? <span style={{ color: 'var(--ov0)', fontSize: 12 }}>No more cities available</span>
              : available.map(c => (
                  <button key={c.city} className="wpick-btn" onClick={() => addCity(c)}>
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
        {allCities.map(c => (
          <WeatherTile
            key={c.city}
            city={c.city}
            country={c.country}
            removable={added.some(a => a.city === c.city)}
            onRemove={() => removeCity(c.city)}
          />
        ))}
      </div>
    </Card>
  )
}
