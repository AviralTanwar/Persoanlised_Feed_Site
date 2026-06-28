import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import NationalNews from './NationalNews'
import TechNews from './TechNews'
import './News.css'

export default function News({ techRef }) {
  return (
    <Card>
      <SectionHeader icon="📰" title="News" />
      <div className="newsgrid">
        <NationalNews />
        <div ref={techRef}>
          <TechNews />
        </div>
      </div>
    </Card>
  )
}
