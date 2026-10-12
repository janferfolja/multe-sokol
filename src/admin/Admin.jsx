import { useEffect, useState } from 'react'
import { api, isDemo } from '../lib/api'
import { go } from '../lib/router'
import NewFines from './NewFines'
import Payments from './Payments'
import History from './History'
import Players from './Players'
import FineTypes from './FineTypes'

const TABS = [
  ['new', '➕ Nove multe'],
  ['pay', '💶 Plačila'],
  ['history', '📜 Zgodovina'],
  ['players', '👥 Igralci'],
  ['types', '📋 Vrste mult'],
]

export default function Admin({ data, reload }) {
  const [user, setUser] = useState(undefined) // undefined = still checking
  const [admin, setAdmin] = useState(false)
  const [tab, setTab] = useState('new')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let alive = true
    const update = async (u) => {
      const ok = u ? await api.isAdmin() : false
      if (!alive) return
      setUser(u)
      setAdmin(ok)
      if (u && new URLSearchParams(window.location.search).has('admin')) go('admin')
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
      setToast({ kind: 'ok', text: message })
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
        <button className="btn btn-sm btn-ghost" onClick={() => api.signOut()}>Odjava</button>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'new' && <NewFines {...props} />}
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
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api.signIn(email.trim())
      setState('sent')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <section className="section narrow">
      <h2 className="section-title"><span className="section-icon">🔐</span>Prijava za admine</h2>
      {state === 'sent' && !isDemo ? (
        <p>Preveri e-pošto <b>{email}</b> in odpri povezavo za prijavo.</p>
      ) : (
        <form onSubmit={submit} className="form">
          <label>
            E-pošta
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={state === 'sending'}>
            {isDemo ? 'Vstopi (demo)' : state === 'sending' ? 'Pošiljam…' : 'Pošlji mi povezavo'}
          </button>
          {state === 'error' && <p className="form-error">{error}</p>}
          <p className="hint">{isDemo ? 'V demo načinu deluje katerikoli e-naslov.' : 'Po e-pošti ti pošljemo povezavo za prijavo, brez gesla.'}</p>
        </form>
      )}
    </section>
  )
}
