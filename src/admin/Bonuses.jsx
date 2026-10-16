import { useState } from 'react'
import { api } from '../lib/api'
import { bonusAvailable, fullName, isJoker, todayISO } from '../lib/stats'
import { BonusList } from '../public/Bonuses'

const EMPTY = { date: '', player_id: '', reason: '', reward_kind: 'skip_next', reward: '' }

// Bonusi: reward a player for something good. A jolly ("skip_next") cancels their next multa
// automatically when it is added (see NewFines); a custom reward is marked used by hand.
export default function Bonuses({ data, run }) {
  const [editing, setEditing] = useState(null) // bonus being edited, or null for the "new" form
  const bonuses = data.bonuses ?? []

  const actions = (b) => (
    <div className="row-actions">
      {!isJoker(b) && (
        <button className="btn btn-sm btn-ghost" title={b.used_at ? 'Označi kot neizkoriščen' : 'Označi kot izkoriščen'}
          onClick={() => run(() => api.saveBonus({ id: b.id, used_at: b.used_at ? null : new Date().toISOString() }),
            b.used_at ? 'Bonus spet na voljo' : 'Bonus izkoriščen ✓')}>
          {b.used_at ? '↩︎' : '✓'}
        </button>
      )}
      <button className="btn btn-sm btn-ghost" title="Uredi" onClick={() => { setEditing(b); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>✎</button>
      <button className="btn btn-sm btn-ghost btn-danger" title="Izbriši"
        onClick={() => confirm('Izbrišem ta bonus?') && run(() => api.deleteBonus(b.id), 'Bonus izbrisan')}>
        🗑
      </button>
    </div>
  )

  return (
    <>
      <BonusForm
        key={editing?.id ?? 'new'}
        data={data}
        run={run}
        initial={editing ?? { ...EMPTY, date: todayISO() }}
        onDone={() => setEditing(null)}
      />
      <section className="section">
        <h2 className="section-title"><span className="section-icon">📜</span>Vsi bonusi<span className="count-chip">{bonuses.length}</span></h2>
        <BonusList data={data} bonuses={bonuses} renderActions={actions} />
      </section>
    </>
  )
}

function BonusForm({ data, run, initial, onDone }) {
  const isEdit = initial.id != null
  const [form, setForm] = useState({ ...initial, reward: initial.reward ?? '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const players = data.players.filter((p) => p.active || p.id === initial.player_id)
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
  // A jolly that already cancelled a multa can't be switched to another player or reward type.
  const locked = isEdit && isJoker(initial) && !bonusAvailable(initial)
  const valid = form.player_id !== '' && form.reason.trim() !== '' && (form.reward_kind !== 'custom' || form.reward.trim() !== '')

  const save = async (e) => {
    e.preventDefault()
    if (!valid) return
    const b = {
      ...(isEdit ? { id: initial.id } : {}),
      date: form.date,
      player_id: Number(form.player_id),
      reason: form.reason.trim(),
      reward_kind: form.reward_kind,
      reward: form.reward_kind === 'custom' ? form.reward.trim() : null,
    }
    if (await run(() => api.saveBonus(b), isEdit ? 'Bonus posodobljen ✓' : 'Bonus dodan 🏅')) {
      setForm({ ...EMPTY, date: todayISO() })
      onDone()
    }
  }

  return (
    <form className="section form" onSubmit={save}>
      <h2 className="section-title"><span className="section-icon">🏅</span>{isEdit ? 'Uredi bonus' : 'Nov bonus'}</h2>
      <p className="hint">Za dobra dejanja. 🃏 Jolly samodejno prekliče naslednjo multo tega igralca.</p>
      <div className="form-row">
        <label>
          Datum
          <input type="date" value={form.date} max={todayISO()} onChange={set('date')} required />
        </label>
        <label className="grow">
          Igralec
          <select value={form.player_id} onChange={set('player_id')} required disabled={locked}>
            <option value="">— izberi —</option>
            {players.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
          </select>
        </label>
      </div>
      <label>
        Kaj je naredil dobrega
        <input type="text" value={form.reason} onChange={set('reason')} required placeholder="npr. MVP tekme, pospravil telovadnico, pripeljal ekipo…" />
      </label>
      <div className="seg" role="radiogroup" aria-label="Nagrada">
        <button type="button" role="radio" aria-checked={form.reward_kind === 'skip_next'} disabled={locked}
          className={form.reward_kind === 'skip_next' ? 'on' : ''} onClick={() => setForm({ ...form, reward_kind: 'skip_next' })}>
          🃏 Jolly: preklic naslednje multe
        </button>
        <button type="button" role="radio" aria-checked={form.reward_kind === 'custom'} disabled={locked}
          className={form.reward_kind === 'custom' ? 'on' : ''} onClick={() => setForm({ ...form, reward_kind: 'custom' })}>
          🎁 Druga nagrada
        </button>
      </div>
      {form.reward_kind === 'custom' && (
        <label>
          Nagrada
          <input type="text" value={form.reward} onChange={set('reward')} required placeholder="npr. bjra na račun ekipe, prost trening…" />
        </label>
      )}
      <div className="form-actions">
        {isEdit && <button type="button" className="btn btn-ghost" onClick={onDone}>Prekliči</button>}
        <button className="btn btn-primary" disabled={!valid}>{isEdit ? 'Shrani' : 'Dodaj bonus'}</button>
      </div>
    </form>
  )
}
