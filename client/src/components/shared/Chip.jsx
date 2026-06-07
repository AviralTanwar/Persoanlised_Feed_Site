export default function Chip({ children, color, small }) {
  return (
    <span
      className="chip"
      style={{
        background: `color-mix(in srgb, ${color || 'var(--blue)'} 18%, transparent)`,
        color: color || 'var(--blue)',
        padding: small ? '2px 7px' : '3px 10px',
      }}
    >
      {children}
    </span>
  )
}
