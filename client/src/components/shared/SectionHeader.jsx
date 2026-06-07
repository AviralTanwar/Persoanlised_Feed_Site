export default function SectionHeader({ icon, title, right }) {
  return (
    <div className="sh">
      <span className="sh-lbl">{icon} {title}</span>
      {right}
    </div>
  )
}
