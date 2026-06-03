import Weather from './components/Weather'
import NationalNews from './components/NationalNews'
import TechNews from './components/TechNews'
import YouTubeViewer from './components/YouTubeViewer'
import WebPageViewer from './components/WebPageViewer'
import Improvements from './components/Improvements'
import './App.css'

const CITIES = [
  { city: 'Noida', country: 'IN', units: 'metric' },
  { city: 'Greater Noida', country: 'IN', units: 'metric' },
]

export default function App() {
  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>🚀 Dashboard</h1>
      </header>

      <div className="grid-top">
        <Weather cities={CITIES} />
        <NationalNews country="in" pageSize={6} />
        <TechNews />
      </div>

      <div className="grid-full">
        <YouTubeViewer />
      </div>

      <div className="grid-full">
        <WebPageViewer />
      </div>

      <div className="grid-full">
        <Improvements />
      </div>
    </div>
  )
}
