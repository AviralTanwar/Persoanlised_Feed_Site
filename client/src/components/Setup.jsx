import { useState } from 'react'
import './Setup.css'

export default function Setup({ onComplete }) {
  const [form, setForm] = useState({
    firstname: '', lastname: '', username: '',
    title: '', email: '', number: '',
    password: '', confirm: '',
  })
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.firstname.trim() || !form.lastname.trim())
      return setError('First and last name are required.')
    if (!form.username.trim())
      return setError('Username is required.')
    if (form.password.length < 6)
      return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm)
      return setError('Passwords do not match.')

    setLoading(true)
    try {
      const res = await fetch('/api/user-info/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname:   form.firstname.trim(),
          lastname:    form.lastname.trim(),
          username:    form.username.trim(),
          title:       form.title.trim(),
          email:       form.email.trim(),
          number:      form.number.trim(),
          password:    form.password,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Setup failed')
      }
      const user = await res.json()
      onComplete(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-header">
          <span className="setup-logo">🚀</span>
          <h1 className="setup-title">Welcome to API Explorer Dashboard</h1>
          <p className="setup-sub">Set up your profile once — your name appears everywhere.</p>
        </div>

        <form className="setup-form" onSubmit={submit}>
          <div className="setup-section-label">Your Profile</div>

          <div className="setup-row">
            <div className="setup-field">
              <label>First Name <span className="req">*</span></label>
              <input value={form.firstname} onChange={e => set('firstname', e.target.value)} placeholder="Aviral" autoFocus />
            </div>
            <div className="setup-field">
              <label>Last Name <span className="req">*</span></label>
              <input value={form.lastname} onChange={e => set('lastname', e.target.value)} placeholder="Tanwar" />
            </div>
          </div>

          <div className="setup-field">
            <label>Username <span className="req">*</span></label>
            <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="Aviral_Tanwar" />
          </div>

          <div className="setup-row">
            <div className="setup-field">
              <label>Title <span className="opt">(optional)</span></label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Software Engineer" />
            </div>
            <div className="setup-field">
              <label>Email <span className="opt">(optional)</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
            </div>
          </div>

          <div className="setup-field">
            <label>Phone <span className="opt">(optional)</span></label>
            <input value={form.number} onChange={e => set('number', e.target.value)} placeholder="+91 98765 43210" />
          </div>

          <div className="setup-section-label" style={{ marginTop: '1.4rem' }}>To-Do Password</div>
          <p className="setup-hint">Used to unlock the Kanban section. Keep it somewhere safe — it cannot be recovered without direct DB access.</p>

          <div className="setup-row">
            <div className="setup-field">
              <label>Password <span className="req">*</span></label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="setup-field">
              <label>Confirm <span className="req">*</span></label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          {error && <p className="setup-error">⚠️ {error}</p>}

          <button className="setup-submit" type="submit" disabled={loading}>
            {loading ? 'Setting up…' : 'Create Account & Enter Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )
}
