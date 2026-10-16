import { useEffect } from 'react'
import { donationCount, formatEuro, fullName, initials, playerStats } from '../lib/stats'
import { BonusList } from './Bonuses'
import { PAYPAL_POOL_URL } from '../lib/config'
import { FineList } from './AllFines'

export default function PlayerModal({ data, playerId, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const player = data.players.find((p) => p.id === playerId)
  const fines = data.fines.filter((f) => f.player_id === playerId)
  const s = playerStats({ ...data, players: [player], fines })[0]
  const own = (data.donations ?? []).filter((d) => d.player_id === playerId)
  const charityKasa = donationCount(own, 'kasa')
  const charityMerenda = donationCount(own, 'merenda')
  const bonuses = (data.bonuses ?? []).filter((b) => b.player_id === playerId)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={fullName(player)} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zapri">×</button>
        <div className="modal-head">
          <div className="player-avatar player-avatar-lg">{initials(player)}</div>
          <div>
            <h2>{fullName(player)}</h2>
            {player.alias && <div className="player-card-alias">"{player.alias}"</div>}
          </div>
        </div>
        <div className="stats-total-numbers">
          <div className="stat-pill"><span className="stat-pill-label">Multe</span><span className="stat-pill-value">{s.count}</span></div>
          <div className="stat-pill stat-pill-gold"><span className="stat-pill-label">Euro</span><span className="stat-pill-value">{formatEuro(s.euro)}</span></div>
          <div className="stat-pill"><span className="stat-pill-label">Kase</span><span className="stat-pill-value">{s.kasa}</span></div>
          <div className="stat-pill"><span className="stat-pill-label">Merende</span><span className="stat-pill-value">{s.merenda}</span></div>
          {charityKasa > 0 && (
            <div className="stat-pill"><span className="stat-pill-label">🍻 Dobr. kase</span><span className="stat-pill-value">{charityKasa}</span></div>
          )}
          {charityMerenda > 0 && (
            <div className="stat-pill"><span className="stat-pill-label">🍕 Dobr. merende</span><span className="stat-pill-value">{charityMerenda}</span></div>
          )}
          <div className="stat-pill stat-pill-pending">
            <span className="stat-pill-label">Za plačat</span>
            <span className="stat-pill-value">{s.pending}{s.pendingEuro > 0 ? ` · ${formatEuro(s.pendingEuro)}` : ''}</span>
          </div>
        </div>
        {s.pending > 0 && <div className="paypal-row"><a className="btn btn-paypal" href={PAYPAL_POOL_URL} target="_blank" rel="noopener noreferrer">💳 Plači zs Paypall</a></div>}
        {bonuses.length > 0 && (
          <>
            <h3 className="modal-subtitle">🏅 Bonusi</h3>
            <BonusList data={data} bonuses={bonuses} />
            <h3 className="modal-subtitle">📜 Multe</h3>
          </>
        )}
        <FineList data={data} fines={fines} />
      </div>
    </div>
  )
}
