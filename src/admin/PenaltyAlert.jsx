import { useState } from 'react'
import { addFinesWithJolly, overdueForPenalty, penaltyType } from '../lib/fines'
import { daysSince, formatDate, fullName, plural, todayISO } from '../lib/stats'

const LEVEL_LABEL = { 1: '14+ dni', 2: '28+ dni · dvojna' }

// Shown on every admin tab: multe unpaid for 14+ / 28+ days, with one tap to add "Ni prnesu multe".
export default function PenaltyAlert({ data, run }) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const due = overdueForPenalty(data.fines)
  if (due.length === 0) return null

  const type = penaltyType(data.fineTypes)
  const players = new Map(data.players.map((p) => [p.id, p]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))
  const n = due.length
  const total = due.reduce((sum, d) => sum + d.levels.length, 0)
  const doubles = due.filter((d) => d.levels.includes(2)).length

  const penalise = async (items) => {
    if (!type) return
    setBusy(true)
    const rows = items.flatMap(({ fine, levels }) => levels.map((level) => ({
      player_id: fine.player_id, fine_type_id: type.id, date: todayISO(), penalty_for: fine.id, penalty_level: level,
      note: `za multo z dne ${formatDate(fine.date)}${level === 2 ? ' · 28+ dni, dvojna' : ''}`,
    })))
    let msg = ''
    await run(async () => { msg = await addFinesWithJolly(rows, data.bonuses ?? []) }, () => msg)
    setBusy(false)
  }

  return (
    <section className="penalty-alert" role="alert">
      <div className="penalty-head">
        <div>
          <b>⏰ {n} {plural(n, 'multa ni plačana', 'multe niso plačane')} že 14+ dni</b>
          <div className="penalty-sub">
            {type
              ? <>„{type.name}” ({type.price}€) po 14 dneh, še enkrat po 28 dneh (dvojna).{doubles > 0 && <> ⏰⏰ {doubles} že 28+ dni.</>}</>
              : <>Vrsta „Ni prnesu multe” ne obstaja: dodaj jo v Vrste mult.</>}
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(!open)}>{open ? 'Skrij' : 'Pokaži'}</button>
      </div>

      {open && (
        <div className="penalty-list">
          {due.map((d) => (
            <div key={d.fine.id} className="penalty-row">
              <div className="grow">
                <b>{fullName(players.get(d.fine.player_id))}</b>
                <div className="muted small">
                  {types.get(d.fine.fine_type_id)?.name} · {formatDate(d.fine.date)} · +{daysSince(d.fine.date)} dni
                </div>
                <div className="penalty-levels">
                  {d.levels.map((l) => <span key={l} className={`penalty-level l${l}`}>{l === 2 ? '⏰⏰' : '⏰'} {LEVEL_LABEL[l]}</span>)}
                </div>
              </div>
              <button className="btn btn-sm" disabled={busy || !type} onClick={() => penalise([d])}>
                Dodaj{d.levels.length > 1 ? ` (${d.levels.length})` : ''}
              </button>
            </div>
          ))}
        </div>
      )}

      {type && (
        <button className="btn btn-primary btn-block" disabled={busy}
          onClick={() => confirm(`Dodam ${total}× „${type.name}” (${total * type.price}€ skupaj)?`) && penalise(due)}>
          Dodaj „{type.name}” ({total})
        </button>
      )}
    </section>
  )
}
