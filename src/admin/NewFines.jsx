import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { formatDate, fullName, initials, jokersFor, plural, priceLabel, todayISO } from '../lib/stats'
import { addFinesWithJolly } from '../lib/fines'

// Add one fine type to one or more players in one go.
export default function NewFines({ data, run }) {
  const [date, setDate] = useState(todayISO)
  const [typeId, setTypeId] = useState('')
  const [picked, setPicked] = useState(() => new Set())
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  const players = useMemo(
    () => data.players.filter((p) => p.active).sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [data.players],
  )
  const types = data.fineTypes.filter((t) => t.active)
  const bonuses = data.bonuses ?? []
  const hasJolly = (pid) => jokersFor(bonuses, pid).length > 0
  const jollyPicked = [...picked].filter(hasJolly)
  const type = data.fineTypes.find((t) => t.id === Number(typeId))
  const needle = search.trim().toLowerCase()
  const visible = needle
    ? players.filter((p) => `${fullName(p)} ${p.alias ?? ''}`.toLowerCase().includes(needle))
    : players

  // Functional update: quick successive taps must each see the latest selection.
  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!type || picked.size === 0) return
    setBusy(true)
    const rows = [...picked].map((player_id) => ({ player_id, fine_type_id: type.id, date, note: note.trim() || null }))
    let msg = ''
    const ok = await run(async () => { msg = await addFinesWithJolly(rows, bonuses) }, () => msg)
    setBusy(false)
    if (ok) {
      setPicked(new Set())
      setNote('')
      setSearch('')
    }
  }

  const recent = [...data.fines]
    .filter((f) => f.created_by !== 'import')
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id)
    .slice(0, 8)

  return (
    <>
      <form className="section form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Datum
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="grow">
            Multa
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
              <option value="">— izberi —</option>
              {['euro', 'kasa', 'merenda'].map((kind) => (
                <optgroup key={kind} label={kind === 'euro' ? 'Euro' : kind.toUpperCase()}>
                  {types.filter((t) => t.kind === kind).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {priceLabel(t.kind, t.price)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="player-picker">
          <legend>
            Igralci <span className="count-chip">{picked.size}</span>
            {picked.size > 0 && <button type="button" className="link small" onClick={() => setPicked(new Set())}>počisti</button>}
          </legend>
          <input type="search" placeholder="Išči igralce…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="chips">
            {visible.map((p) => (
              <button
                type="button" key={p.id} aria-pressed={picked.has(p.id)}
                className={`chip ${picked.has(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}
              >
                <span className="chip-avatar">{initials(p)}</span>
                {p.name} {p.surname}
                {p.alias && <span className="chip-alias">{p.alias}</span>}
                {hasJolly(p.id) && <span title="Ima jolly">🃏</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          Opomba (neobvezno)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. trening v torek, slika v skupini…" />
        </label>

        {jollyPicked.length > 0 && (
          <p className="jolly-note">
            🃏 {jollyPicked.map((pid) => fullName(players.find((p) => p.id === pid))).join(', ')}:{' '}
            {plural(jollyPicked.length, 'ima jolly, zato bo ta multa oproščena', 'imajo jolly, zato bodo te multe oproščene')}.
          </p>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy || !type || picked.size === 0}>
          {picked.size === 0 || !type
            ? 'Izberi multo in igralce'
            : `Dodaj ${multeN(picked.size)}` +
              (type.kind === 'euro' ? ` · ${priceLabel('euro', type.price * picked.size)}` : '')}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="section">
          <h2 className="section-title"><span className="section-icon">🕒</span>Zadnje dodane</h2>
          <div className="fine-list">
            {recent.map((f) => {
              const p = data.players.find((x) => x.id === f.player_id)
              const t = data.fineTypes.find((x) => x.id === f.fine_type_id)
              return (
                <div key={f.id} className="fine-row">
                  <div className="fine-date">{formatDate(f.date)}</div>
                  <div className="fine-main"><b>{fullName(p)}</b><div className="fine-type">{t?.name}{f.note ? ` · ${f.note}` : ''}</div></div>
                  <div className={`price-badge price-${t?.kind}`}>{t && priceLabel(t.kind, f.amount)}</div>
                  <button className="btn btn-sm btn-ghost" onClick={() => run(() => api.deleteFines([f.id]), 'Multa razveljavljena')}>Razveljavi</button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
