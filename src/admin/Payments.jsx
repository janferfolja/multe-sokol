import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { formatEuro, fullName, multeN, playerStats, plural } from '../lib/stats'
import { FineList, useFineFilters } from '../public/AllFines'

export default function Payments({ data, run }) {
  const debtors = useMemo(() => playerStats(data).filter((s) => s.pending > 0).sort((a, b) => b.pending - a.pending), [data])
  const unpaidData = useMemo(() => ({ ...data, fines: data.fines.filter((f) => !f.paid && !f.waived) }), [data])
  const { filtered, controls } = useFineFilters(unpaidData, { defaultStatus: 'unpaid' })
  const [selected, setSelected] = useState(() => new Set())

  // Functional update: quick successive taps must each see the latest selection.
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const allSelected = filtered.length > 0 && filtered.every((f) => selected.has(f.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((f) => f.id)))

  const markPaid = async (ids, label) => {
    if (await run(() => api.setPaid(ids, true), label)) setSelected(new Set())
  }

  const playerUnpaidIds = (pid) => data.fines.filter((f) => !f.paid && !f.waived && f.player_id === pid).map((f) => f.id)

  return (
    <>
      <section className="section">
        <h2 className="section-title"><span className="section-icon">🧾</span>Kdo mora plačat<span className="count-chip">{debtors.length}</span></h2>
        {debtors.length === 0 ? <p className="empty">Vsi so plačali. 🎉</p> : (
          <div className="debtors">
            {debtors.map((s) => (
              <div key={s.player.id} className="debtor-row">
                <div className="grow"><b>{fullName(s.player)}</b>{s.player.alias && <span className="muted"> "{s.player.alias}"</span>}</div>
                <div className="muted">{multeN(s.pending)}</div>
                <div className="debtor-amount">{s.pendingEuro > 0 ? formatEuro(s.pendingEuro) : '—'}</div>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    if (confirm(plural(s.pending, `Označim neplačano multo igralca ${fullName(s.player)} kot plačano?`, `Označim vse neplačane multe (${s.pending}) igralca ${fullName(s.player)} kot plačane?`))) {
                      markPaid(playerUnpaidIds(s.player.id), `${fullName(s.player)}: vse plačano ✓`)
                    }
                  }}
                >
                  Vse plačano
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title"><span className="section-icon">☑️</span>Posamezne neplačane multe</h2>
        {controls}
        <div className="bulk-bar">
          <label className="check"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Izberi vse ({filtered.length})</label>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={() => markPaid([...selected], `${multeN(selected.size)} ${plural(selected.size, 'plačana', 'plačane')} ✓`)}
          >
            {selected.size ? `Označi kot ${plural(selected.size, 'plačano', 'plačane')} (${selected.size})` : 'Označi kot plačane'}
          </button>
        </div>
        <FineList data={data} fines={filtered} selectable selected={selected} onToggle={toggle} />
      </section>
    </>
  )
}
