import useTime from '../../hooks/useTime'
import './SideNav.css'

const NAV_ITEMS = [
  { id: 'weather',      icon: '🌤️', label: 'Weather' },
  { id: 'news',         icon: '📰', label: 'National News' },
  { id: 'tech',         icon: '💻', label: 'Tech News' },
  { id: 'notes',        icon: '📓', label: 'OneNote' },
  { id: 'youtube',      icon: '🎬', label: 'YouTube' },
  { id: 'webpages',     icon: '🌐', label: 'Web Pages' },
  { id: 'todo',         icon: '✅', label: 'To-Do' },
  { id: 'improvements', icon: '💡', label: 'Improvements' },
]

export default function SideNav({ active, onNav, open, onToggle, clock, theme, onThemeToggle }) {
  const now = useTime()

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: clock === '12h',
  })
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <>
      {/* ── Hamburger toggle ── */}
      <button
        className={`nav-toggle${open ? ' open' : ''}`}
        onClick={onToggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <span className="bars">
          <span className="ln" />
          <span className="ln" />
          <span className="ln" />
        </span>
        <span className="nav-toggle-lbl">{open ? 'Close' : 'Menu'}</span>
      </button>

      {/* ── Theme toggle (top-right) ── */}
      <button className="theme-toggle" onClick={onThemeToggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* ── Scrim ── */}
      <div className={`nav-scrim${open ? ' show' : ''}`} onClick={onToggle} />

      {/* ── Drawer ── */}
      <nav className={`sidenav${open ? ' open' : ''}`}>
        <div className="nav-brand">
          <span className="nav-brand-ico">🚀</span>
          <span className="nav-brand-txt">API Explorer<br />Dashboard</span>
        </div>

        <div className="nav-list">
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              className={`nav-item${active === n.id ? ' on' : ''}`}
              onClick={() => onNav(n.id)}
            >
              <span className="nav-ico">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-foot">
          <div className="nav-time">{timeStr}</div>
          <div className="nav-date">{dateStr}</div>
        </div>
      </nav>
    </>
  )
}
