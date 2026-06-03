import { useEffect, useState } from 'react'

const ICONS = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
  Haze: '🌫️', Smoke: '🌫️', Dust: '🌪️',
}

function CityWeather({ city, country, units }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const unitSym = units === 'metric' ? '°C' : '°F'

  const load = () => {
    setError(null)
    fetch(`http://localhost:3001/api/weather?city=${city}&country=${country}&units=${units}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [city])

  if (error) return <p className="error">Weather unavailable: {error}</p>
  if (!data) return <p className="muted">Loading {city}…</p>

  const icon = ICONS[data.weather[0].main] || '🌡️'
  const temp = Math.round(data.main.temp)
  const feels = Math.round(data.main.feels_like)

  return (
    <div className="weather-card">
      <div className="weather-main">
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">{temp}{unitSym}</span>
      </div>
      <div className="weather-details">
        <strong>{data.name}</strong> · {data.weather[0].description}
        <br />
        Feels like {feels}{unitSym} &nbsp;|&nbsp; 💧 {data.main.humidity}% &nbsp;|&nbsp; 💨 {data.wind.speed} m/s
      </div>
      <div className="weather-actions">
        <a href={`https://openweathermap.org/city/${data.id}`} target="_blank" rel="noreferrer" className="btn-link">
          🌐 Forecast
        </a>
        <button onClick={load} className="btn-icon" title="Refresh">🔄</button>
      </div>
    </div>
  )
}

export default function Weather({ cities }) {
  const [activeTab, setActiveTab] = useState(0)
  const list = Array.isArray(cities) ? cities : [cities]

  return (
    <section className="widget">
      <h3>🌤️ Weather Today</h3>
      {list.length > 1 && (
        <div className="tabs">
          {list.map((c, i) => (
            <button
              key={i}
              className={`tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {c.city}
            </button>
          ))}
        </div>
      )}
      <CityWeather {...list[activeTab]} />
    </section>
  )
}
