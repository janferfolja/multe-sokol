import { useCallback, useEffect, useState } from 'react'
import { api, isDemo } from './lib/api'
import { useRoute } from './lib/router'
import Home from './public/Home'
import AllFines from './public/AllFines'
import PlayerModal from './public/PlayerModal'
import Admin from './admin/Admin'
import Install from './public/Install'
import { isStandalone } from './lib/install'

export default function App() {
  const route = useRoute()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [openPlayer, setOpenPlayer] = useState(null)

  const reload = useCallback(async () => {
    try {
      setData(await api.load())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <div className="app-container">
      <header className="app-header">
        <a className="app-logo" href="#/" aria-label="Home">🦅</a>
        <div>
          <h1 className="app-title">Multe Sokol</h1>
          <p className="app-subtitle">Hall of Shame</p>
        </div>
        {!isStandalone() && route !== 'app' && <a className="get-app" href="#/app">📲 App</a>}
      </header>

      <nav className="top-nav">
        <a href="#/" className={route === 'home' ? 'active' : ''}>Lestvica</a>
        <a href="#/multe" className={route === 'multe' ? 'active' : ''}>Multe</a>
        <a href="#/admin" className={route === 'admin' ? 'active' : ''}>Admin</a>
      </nav>

      {isDemo && (
        <div className="demo-banner">
          <span>Modalità demo: i dati sono salvati solo in questo browser. Collega Supabase per renderli condivisi.</span>
        </div>
      )}

      {error && <div className="error-box">Errore nel caricamento: {error} <button className="btn btn-sm" onClick={reload}>Riprova</button></div>}
      {!data && !error && <div className="loading">Caricamento dati…</div>}

      {data && route === 'home' && <Home data={data} onPlayer={setOpenPlayer} />}
      {data && route === 'multe' && <AllFines data={data} onPlayer={setOpenPlayer} />}
      {data && route === 'admin' && <Admin data={data} reload={reload} />}
      {route === 'app' && <Install />}

      {data && openPlayer != null && (
        <PlayerModal data={data} playerId={openPlayer} onClose={() => setOpenPlayer(null)} />
      )}
    </div>
  )
}
