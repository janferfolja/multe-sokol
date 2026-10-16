import { useEffect, useRef, useState } from 'react'
import { api, isDemo } from '../lib/api'
import { authLinkType, go } from '../lib/router'
import NewFines from './NewFines'
import Payments from './Payments'
import History from './History'
import Players from './Players'
import FineTypes from './FineTypes'
import Charity from './Charity'
import Bonuses from './Bonuses'
import PenaltyAlert from './PenaltyAlert'

const TABS = [
  ['new', '➕ Nove multe'],
  ['bonus', '🏅 Bonusi'],
  ['charity', '🍻 Dobrodelno'],
  ['pay', '💶 Plačila'],
  ['history', '🗂️ Arhiv'],
  ['players', '👥 Igralci'],
  ['types', '📋 Vrste mult'],
]

export default function Admin({ data, reload }) {
  const [user, setUser] = useState(undefined) // undefined = still checking
  const [admin, setAdmin] = useState(false)
  const [tab, setTab] = useState('new')
  const [toast, setToast] = useState(null)
  const tabsRef = useRef(null)
  const tabsAnchor = useRef(null) // marks where the tab bar sits when not pinned

  // Expose the tab bar's height so other sticky bars (Plačila) can sit right under it.
  useEffect(() => {
    const bar = tabsRef.current
    if (!bar) return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--admin-tabs-h', `${bar.offsetHeight}px`))
    ro.observe(bar)
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--admin-tabs-h') }
  })

  // Switch tab; if the sticky tab bar is pinned (page scrolled down), jump to the top of the new tab.
  const openTab = (id) => {
    setTab(id)
    const anchor = tabsAnchor.current
    if (anchor && anchor.getBoundingClientRect().top < 0) {
      requestAnimationFrame(() => window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY }))
    }
  }

  useEffect(() => {
    let alive = true
    const update = async (u) => {
      const ok = u ? await api.isAdmin() : false
      if (!alive) return
      setUser(u)
      setAdmin(ok)
      if (u && (authLinkType || new URLSearchParams(window.location.search).has('admin'))) go('admin')
    }
    api.getUser().then(update)
    const off = api.onAuthChange(update)
    return () => { alive = false; off() }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Run a write, then refresh data and show a confirmation (or the error).
  const run = async (fn, message) => {
    try {
      await fn()
      await reload()
      setToast({ kind: 'ok', text: typeof message === 'function' ? message() : message })
      return true
    } catch (e) {
      setToast({ kind: 'err', text: `Napaka: ${e.message}` })
      return false
    }
  }

  if (user === undefined) return <div className="loading">Preverjam dostop…</div>
  if (!user) return <Login />
  if (!admin) {
    return (
      <section className="section narrow">
        <h2 className="section-title">Dostop zavrnjen</h2>
        <p><b>{user.email}</b> ni med admini. Prosi admina, naj te doda.</p>
        <button className="btn" onClick={() => api.signOut()}>Odjava</button>
      </section>
    )
  }

  const props = { data, run }
  return (
    <>
      <div className="admin-bar">
        <span>Prijavljen kot <b>{user.email}</b></span>
        <div className="admin-bar-actions">
          <ChangePassword run={run} />
          <button className="btn btn-sm btn-ghost" onClick={() => api.signOut()}>Odjava</button>
        </div>
      </div>
      <PenaltyAlert {...props} />
      <div ref={tabsAnchor} aria-hidden />
      <nav className="admin-tabs" role="tablist" ref={tabsRef}>
        {TABS.map(([id, label]) => {
          const [icon, ...words] = label.split(' ')
          return (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => openTab(id)}>
              <span className="admin-tab-icon" aria-hidden>{icon}</span>
              <span className="admin-tab-label">{words.join(' ')}</span>
            </button>
          )
        })}
      </nav>
      {tab === 'new' && <NewFines {...props} />}
      {tab === 'bonus' && <Bonuses {...props} />}
      {tab === 'charity' && <Charity {...props} />}
      {tab === 'pay' && <Payments {...props} />}
      {tab === 'history' && <History {...props} />}
      {tab === 'players' && <Players {...props} />}
      {tab === 'types' && <FineTypes {...props} />}
      {toast && <div className={`toast toast-${toast.kind}`} role="status">{toast.text}</div>}
    </>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState('idle') // idle | sending | error
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api.signIn(email.trim(), password)
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <section className="section narrow">
      <h2 className="section-title"><span className="section-icon">🔐</span>Prijava za admine</h2>
      <form onSubmit={submit} className="form">
        <label>
          E-pošta
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Geslo
          <input type="password" required={!isDemo} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={state === 'sending'}>
          {isDemo ? 'Vstopi (demo)' : state === 'sending' ? 'Prijavljam…' : 'Prijava'}
        </button>
        {state === 'error' && <p className="form-error">{error}</p>}
        <p className="hint">{isDemo ? 'V demo načinu deluje katerikoli e-naslov.' : 'Samo za admine. Račun ti ustvari admin v Supabase.'}</p>
      </form>
    </section>
  )
}

// Opens by itself after an invite / password-reset link, since those log in without a password.
const mustSetPassword = authLinkType === 'invite' || authLinkType === 'recovery'
let promptPending = mustSetPassword

function ChangePassword({ run }) {
  const [open, setOpen] = useState(() => {
    const show = promptPending
    promptPending = false
    return show
  })
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const mismatch = pw2 !== '' && pw !== pw2

  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 8 || pw !== pw2) return
    if (await run(() => api.changePassword(pw), 'Geslo spremenjeno ✓')) {
      setOpen(false)
      setPw('')
      setPw2('')
    }
  }

  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>Spremeni geslo</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal form narrow-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Zapri">×</button>
            <h2>{mustSetPassword ? 'Nastavi si geslo' : 'Novo geslo'}</h2>
            {mustSetPassword && <p className="hint">Z njim se boš naslednjič prijavil v Admin.</p>}
            <label>Novo geslo (vsaj 8 znakov)
              <input type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            <label>Ponovi geslo
              <input type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </label>
            {mismatch && <p className="form-error">Gesli se ne ujemata.</p>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Prekliči</button>
              <button className="btn btn-primary" disabled={pw.length < 8 || pw !== pw2}>Shrani</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
