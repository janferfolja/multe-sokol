import { useState } from 'react'
import { api } from '../lib/api'
import { fullName, initials } from '../lib/stats'

const EMPTY = { name: '', surname: '', alias: '', year: '', active: true }

export default function Players({ data, run }) {
  const [editing, setEditing] = useState(null) // player id, 'new', or null
  const players = [...data.players].sort((a, b) => Number(b.active) - Number(a.active) || fullName(a).localeCompare(fullName(b)))
  const counts = new Map()
  for (const f of data.fines) counts.set(f.player_id, (counts.get(f.player_id) ?? 0) + 1)

  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">👥</span>Giocatori<span className="count-chip">{data.players.length}</span>
        <button className="btn btn-sm btn-primary push-right" onClick={() => setEditing('new')}>+ Nuovo</button>
      </h2>
      <p className="hint">I giocatori non attivi non compaiono tra quelli da multare, ma il loro storico resta.</p>
      {editing === 'new' && <PlayerForm initial={EMPTY} run={run} onDone={() => setEditing(null)} />}
      <div className="manage-list">
        {players.map((p) =>
          editing === p.id ? (
            <PlayerForm key={p.id} initial={{ ...p, alias: p.alias ?? '', year: p.year ?? '' }} run={run} onDone={() => setEditing(null)} />
          ) : (
            <div key={p.id} className={`manage-row ${p.active ? '' : 'inactive'}`}>
              <div className="player-avatar player-avatar-sm">{initials(p)}</div>
              <div className="grow">
                <b>{fullName(p)}</b>
                {p.alias && <span className="muted"> "{p.alias}"</span>}
                {p.year && <span className="muted"> · {p.year}</span>}
                {!p.active && <span className="tag">non attivo</span>}
              </div>
              <span className="muted">{counts.get(p.id) ?? 0} multe</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(p.id)}>Modifica</button>
            </div>
          ),
        )}
      </div>
    </section>
  )
}

function PlayerForm({ initial, run, onDone }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const p = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(), surname: form.surname.trim(), alias: form.alias.trim() || null,
      year: form.year ? Number(form.year) : null, active: form.active,
    }
    if (await run(() => api.savePlayer(p), form.id ? 'Giocatore aggiornato ✓' : 'Giocatore aggiunto ✓')) onDone()
  }

  return (
    <form className="inline-form form" onSubmit={save}>
      <div className="form-row">
        <label>Nome<input value={form.name} onChange={set('name')} required autoFocus /></label>
        <label>Cognome<input value={form.surname} onChange={set('surname')} required /></label>
      </div>
      <div className="form-row">
        <label>Soprannome<input value={form.alias} onChange={set('alias')} /></label>
        <label>Anno<input type="number" min="1950" max={new Date().getFullYear()} value={form.year} onChange={set('year')} /></label>
      </div>
      <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Attivo</label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Annulla</button>
        <button className="btn btn-primary">Salva</button>
      </div>
    </form>
  )
}
