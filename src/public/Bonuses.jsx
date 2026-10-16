import { bonusAvailable, formatDate, fullName, isJoker, rewardLabel } from '../lib/stats'

// Bonusi: something good a player did, and the reward. Used on the Multe page, in the player popup
// and in admin (with renderActions).
export function BonusList({ data, bonuses, onPlayer, renderActions }) {
  if (bonuses.length === 0) return <p className="empty">Še ni nobenega bonusa.</p>
  const players = new Map(data.players.map((p) => [p.id, p]))
  const fines = new Map(data.fines.map((f) => [f.id, f]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))

  return (
    <div className="fine-list">
      {bonuses.map((b) => {
        const usedOn = b.used_fine_id != null ? fines.get(b.used_fine_id) : null
        return (
          <div key={b.id} className="fine-row">
            <div className="fine-date">{formatDate(b.date)}</div>
            <div className="fine-main">
              {onPlayer ? (
                <button className="link" onClick={() => onPlayer(b.player_id)}>{fullName(players.get(b.player_id))}</button>
              ) : (
                <b>{fullName(players.get(b.player_id))}</b>
              )}
              <div className="fine-type">{b.reason}</div>
              <div className="bonus-reward">
                {rewardLabel(b)}
                {usedOn && <span className="fine-note"> · porabljen za: {types.get(usedOn.fine_type_id)?.name} ({formatDate(usedOn.date)})</span>}
              </div>
            </div>
            <div className={`status-badge ${bonusAvailable(b) ? 'bonus-open' : 'paid'}`}>
              {bonusAvailable(b) ? (isJoker(b) ? 'Na voljo' : 'Še ni izkoriščen') : isJoker(b) ? 'Porabljen' : 'Izkoriščen'}
            </div>
            {renderActions?.(b)}
          </div>
        )
      })}
    </div>
  )
}

export default function Bonuses({ data, onPlayer }) {
  const bonuses = data.bonuses ?? []
  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">🏅</span>Bonusi
        {bonuses.length > 0 && <span className="count-chip">{bonuses.length}</span>}
      </h2>
      <p className="hint">Za dobra dejanja. 🃏 Jolly prekliče naslednjo multo: ostane na seznamu, a se ne šteje.</p>
      <BonusList data={data} bonuses={bonuses} onPlayer={onPlayer} />
    </section>
  )
}
