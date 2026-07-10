import useTime from '../../hooks/useTime'
import './SideNav.css'

// Maps section_key → nav entry. An array means the section produces multiple nav items (e.g. news has two panels).
const SECTION_META = {
  weather:      { icon: '🌤️', scrollId: 'weather' },
  news:         [
    { icon: '📰', scrollId: 'news', label: 'National News' },
    { icon: '💻', scrollId: 'tech', label: 'Tech News' },
  ],
  todo:         { icon: '✅', scrollId: 'todo' },
  web_pages:    { icon: '🌐', scrollId: 'webpages' },
  youtube:      { icon: '🎬', scrollId: 'youtube' },
  improvements: { icon: '💡', scrollId: 'improvements' },
  onenote:      { icon: '📓', scrollId: 'notes' },
}

export default function SideNav({ active, onNav, open, onToggle, clock, theme, onThemeToggle, viewKpis = [] }) {
  const now = useTime()

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: clock === '12h',
  })
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  const navItems = viewKpis.flatMap(kpi => {
    const meta = SECTION_META[kpi.section_key]
    if (!meta) return []
    if (Array.isArray(meta)) return meta.map(m => ({ ...m }))
    return [{ ...meta, label: kpi.name }]
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
          {navItems.map(n => (
            <button
              key={n.scrollId}
              className={`nav-item${active === n.scrollId ? ' on' : ''}`}
              onClick={() => onNav(n.scrollId)}
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
