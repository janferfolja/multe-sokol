import { useState } from 'react'
import { applyPenalties, overdueForPenalty, penaltyType } from '../lib/fines'
import { daysSince, fineLabel, formatDate, fullName, plural, todayISO } from '../lib/stats'

// Shown on every admin tab: unpaid multe that need "Ni prnesu multe" (14+ days) or doubling (28+ days).
export default function PenaltyAlert({ data, run }) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const due = overdueForPenalty(data.fines)
  if (due.length === 0) return null

  const type = penaltyType(data.fineTypes)
  const players = new Map(data.players.map((p) => [p.id, p]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))
  const n = due.length
  const penalties = due.filter((d) => d.levels.includes(1)).length
  const doubles = due.filter((d) => d.levels.includes(2)).length
  // Doubling works without the penalty type; penalties need it.
  const doable = (d) => d.levels.filter((l) => l === 2 || type)
  const summary = [
    penalties && type ? `${penalties}× „${type.name}”` : null,
    doubles ? `${doubles} ${plural(doubles, 'podvojena multa', 'podvojene multe')}` : null,
  ].filter(Boolean).join(' + ')

  const go = async (items) => {
    const ready = items.map((d) => ({ ...d, levels: doable(d) })).filter((d) => d.levels.length)
    if (!ready.length) return
    setBusy(true)
    let msg = ''
    await run(async () => { msg = await applyPenalties(ready, type, data.bonuses ?? [], todayISO()) }, () => msg)
    setBusy(false)
  }

  return (
    <section className="penalty-alert" role="alert">
      <div className="penalty-head">
        <div>
          <b>⏰ {n} {plural(n, 'multa ni plačana', 'multe niso plačane')} že 14+ dni</b>
          <div className="penalty-sub">
            Po 14 dneh „Ni prnesu multe”{type ? ` (${type.price}€)` : ''}, po 28 dneh se multa podvoji.
            {!type && penalties > 0 && <> Vrsta „Ni prnesu multe” ne obstaja: dodaj jo v Vrste mult.</>}
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(!open)}>{open ? 'Skrij' : 'Pokaži'}</button>
      </div>

      {open && (
        <div className="penalty-list">
          {due.map((d) => {
            const t = types.get(d.fine.fine_type_id)
            return (
              <div key={d.fine.id} className="penalty-row">
                <div className="grow">
                  <b>{fullName(players.get(d.fine.player_id))}</b>
                  <div className="muted small">{t?.name} · {formatDate(d.fine.date)} · +{daysSince(d.fine.date)} dni</div>
                  <div className="penalty-levels">
                    {d.levels.includes(1) && <span className="penalty-level l1">⏰ + „Ni prnesu multe”</span>}
                    {d.levels.includes(2) && (
                      <span className="penalty-level l2">⏰⏰ podvoji: {fineLabel(t, d.fine)} → {fineLabel(t, { ...d.fine, doubled_at: 'x' })}</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-sm" disabled={busy || doable(d).length === 0} onClick={() => go([d])}>Izvedi</button>
              </div>
            )
          })}
        </div>
      )}

      {summary && (
        <button className="btn btn-primary btn-block" disabled={busy}
          onClick={() => confirm(`Izvedem: ${summary}?`) && go(due)}>
          Izvedi vse: {summary}
        </button>
      )}
    </section>
  )
}
