import { useMemo, useState } from 'react'
import { coinsByPlayer, effectLabel, formatPercent, outcomeLabel, realPercent, spinDetail, wheelOutcomes } from '../lib/roulette'
import { formatDate, fullName } from '../lib/stats'
import RouletteWheel from './RouletteWheel'

// Local date of the spin (created_at is UTC).
const spinDate = (s) => {
  const d = new Date(s.created_at)
  return formatDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10))
}
const kindBadge = (kind) => (
  <span className={`status-badge spin-${kind}`}>{kind === 'bonus' ? 'BONUS' : kind === 'malus' ? 'MALUS' : 'NIČ'}</span>
)

// History of spins. Used on the Multe page, in the player popup and in admin (with renderActions).
export function SpinList({ data, spins, onPlayer, renderActions }) {
  if (spins.length === 0) return <p className="empty">Ruleta se še ni zavrtela.</p>
  const players = new Map(data.players.map((p) => [p.id, p]))
  return (
    <div className="fine-list">
      {spins.map((s) => (
        <div key={s.id} className="fine-row">
          <div className="fine-date">{spinDate(s)}</div>
          <div className="fine-main">
            {onPlayer ? (
              <button className="link" onClick={() => onPlayer(s.player_id)}>{fullName(players.get(s.player_id))}</button>
            ) : (
              <b>{fullName(players.get(s.player_id))}</b>
            )}
            <div className="fine-type">🎰 {outcomeLabel(s)}</div>
            <div className="spin-detail">{spinDetail(s, data)}</div>
          </div>
          {kindBadge(s.kind)}
          {renderActions?.(s)}
        </div>
      ))}
    </div>
  )
}

// What the wheel can give and how likely it is.
export function OddsList({ data, wheel }) {
  return (
    <div className="manage-list odds-list">
      {wheel.map((o) => (
        <div key={o.id} className="manage-row">
          <span className={`odds-dot ${o.kind}`} aria-hidden />
          <div className="grow">
            <b>{outcomeLabel(o)}</b>
            <div className="muted small">{effectLabel(o, data.fineTypes)}</div>
          </div>
          <span className="odds-percent">{formatPercent(realPercent(o, wheel))}</span>
        </div>
      ))}
    </div>
  )
}

export default function Roulette({ data, onPlayer }) {
  const [limit, setLimit] = useState(10)
  const wheel = useMemo(() => wheelOutcomes(data.rouletteOutcomes), [data.rouletteOutcomes])
  const spins = data.spins ?? []
  const coins = coinsByPlayer(data)
  const holders = data.players
    .map((p) => ({ p, left: coins.get(p.id)?.length ?? 0 }))
    .filter((x) => x.left > 0)
    .sort((a, b) => b.left - a.left || fullName(a.p).localeCompare(fullName(b.p)))
  if (wheel.length === 0 && spins.length === 0) return null

  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">🎰</span>Ruleta
        {spins.length > 0 && <span className="count-chip">{spins.length}</span>}
      </h2>
      <p className="hint">
        Za vsako multo dobiš 🪙 kovanec. Admin ga zavrti zate: bo multa oproščena ali dvojna?
        Izidi, ki za tvojo multo ne pridejo v poštev, se izpustijo.
      </p>
      {wheel.length > 0 && (
        <div className="roulette-public">
          <RouletteWheel outcomes={wheel} compact />
          <OddsList data={data} wheel={wheel} />
        </div>
      )}
      {holders.length > 0 && (
        <>
          <h3 className="modal-subtitle">🪙 Kovanci za vrtenje</h3>
          <div className="chips coin-holders">
            {holders.map(({ p, left }) => (
              <button key={p.id} className="chip" onClick={() => onPlayer?.(p.id)}>
                {p.alias || fullName(p)} <span className="coin-count">🪙 {left}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {spins.length > 0 && (
        <>
          <h3 className="modal-subtitle">🕒 Zadnja vrtenja</h3>
          <SpinList data={data} spins={spins.slice(0, limit)} onPlayer={onPlayer} />
          {spins.length > limit && (
            <button className="btn btn-ghost btn-block" onClick={() => setLimit(limit + 30)}>Pokaži več</button>
          )}
        </>
      )}
    </section>
  )
}
