import { useMemo, useState } from 'react'
import { formatDate, fullName, priceLabel, seasonOf, seasonsIn } from '../lib/stats'

// Filterable list of fines. Used publicly and, with `renderActions`/`selectable`, in admin.
export function FineList({ data, fines, onPlayer, selectable, selected, onToggle, renderActions }) {
  const players = new Map(data.players.map((p) => [p.id, p]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))
  if (fines.length === 0) return <p className="empty">Nessuna multa trovata.</p>
  return (
    <div className="fine-list">
      {fines.map((f) => {
        const p = players.get(f.player_id)
        const t = types.get(f.fine_type_id)
        return (
          <div key={f.id} className={`fine-row ${selected?.has(f.id) ? 'selected' : ''}`}>
            {selectable && (
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => onToggle(f.id)} aria-label="Seleziona" />
            )}
            <div className="fine-date">{formatDate(f.date)}</div>
            <div className="fine-main">
              <button className="link" onClick={() => onPlayer?.(f.player_id)}>{fullName(p)}</button>
              <div className="fine-type">{t?.name}{f.note ? <span className="fine-note"> · {f.note}</span> : null}</div>
            </div>
            <div className={`price-badge price-${t?.kind}`}>{t && priceLabel(t.kind, f.amount)}</div>
            <div className={`status-badge ${f.paid ? 'paid' : 'unpaid'}`}>{f.paid ? 'Pagata' : 'In sospeso'}</div>
            {renderActions?.(f)}
          </div>
        )
      })}
    </div>
  )
}

export function useFineFilters(data, { defaultStatus = 'all' } = {}) {
  const [q, setQ] = useState('')
  const [player, setPlayer] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [season, setSeason] = useState('')
  const seasons = useMemo(() => seasonsIn(data.fines), [data.fines])

  const filtered = useMemo(() => {
    const players = new Map(data.players.map((p) => [p.id, p]))
    const types = new Map(data.fineTypes.map((t) => [t.id, t]))
    const needle = q.trim().toLowerCase()
    return data.fines.filter((f) => {
      if (player && f.player_id !== Number(player)) return false
      if (type && f.fine_type_id !== Number(type)) return false
      if (status === 'paid' && !f.paid) return false
      if (status === 'unpaid' && f.paid) return false
      if (season && seasonOf(f.date) !== season) return false
      if (needle) {
        const p = players.get(f.player_id)
        const hay = `${fullName(p)} ${p?.alias ?? ''} ${types.get(f.fine_type_id)?.name ?? ''} ${f.note ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [data, q, player, type, status, season])

  const sortedPlayers = [...data.players].sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const controls = (
    <div className="filters">
      <input type="search" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select value={player} onChange={(e) => setPlayer(e.target.value)}>
        <option value="">Tutti i giocatori</option>
        {sortedPlayers.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">Tutti i tipi</option>
        {data.fineTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">Tutti gli stati</option>
        <option value="unpaid">In sospeso</option>
        <option value="paid">Pagate</option>
      </select>
      <select value={season} onChange={(e) => setSeason(e.target.value)}>
        <option value="">Tutte le stagioni</option>
        {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
  return { filtered, controls }
}

export default function AllFines({ data, onPlayer }) {
  const { filtered, controls } = useFineFilters(data)
  const [limit, setLimit] = useState(50)
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">📜</span>Multe<span className="count-chip">{filtered.length}</span></h2>
      {controls}
      <FineList data={data} fines={filtered.slice(0, limit)} onPlayer={onPlayer} />
      {filtered.length > limit && (
        <button className="btn btn-ghost btn-block" onClick={() => setLimit(limit + 100)}>Mostra altre</button>
      )}
    </section>
  )
}
