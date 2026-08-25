import { useEffect, useState } from 'react'
import { CloudSun, CloudRain, Sun, Cloud, CloudDrizzle } from 'lucide-react'
import { REGION_COORDS } from '../data/mockData'

// Open-Meteo is a free weather API that needs no API key — good fit for a
// client-side Fetch API call straight from the browser.
const ENDPOINT = `https://api.open-meteo.com/v1/forecast?latitude=${REGION_COORDS.lat}&longitude=${REGION_COORDS.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`

function iconFor(code) {
  if (code === 0) return Sun
  if ([1, 2].includes(code)) return CloudSun
  if (code === 3) return Cloud
  if ([51, 53, 55, 61, 63].includes(code)) return CloudDrizzle
  if ([65, 80, 81, 82, 95].includes(code)) return CloudRain
  return CloudSun
}

export default function WeatherCard() {
  const [days, setDays] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    fetch(ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`Weather request failed (${res.status})`)
        return res.json()
      })
      .then((data) => {
        const d = data.daily
        const parsed = d.time.slice(0, 5).map((date, i) => ({
          date,
          max: Math.round(d.temperature_2m_max[i]),
          min: Math.round(d.temperature_2m_min[i]),
          rain: d.precipitation_probability_max[i],
          code: d.weathercode[i],
        }))
        setDays(parsed)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="card">
      <div className="card__head">
        <h3>Weather Forecast</h3>
        <span className="card__tag">Live · Open-Meteo API</span>
      </div>

      {status === 'loading' && <div className="muted-line">Fetching forecast…</div>}
      {status === 'error' && (
        <div className="muted-line">Couldn't reach the weather API right now.</div>
      )}

      {status === 'ready' && (
        <div className="weather-row">
          {days.map((d, i) => {
            const Icon = iconFor(d.code)
            const label = i === 0
              ? 'Today'
              : new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })
            return (
              <div className="weather-day" key={d.date}>
                <div className="weather-day__label">{label}</div>
                <Icon size={22} strokeWidth={1.6} />
                <div className="weather-day__temp">
                  {d.max}°/{d.min}°
                </div>
                <div className="weather-day__rain">{d.rain}%</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
