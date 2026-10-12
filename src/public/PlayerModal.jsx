import { useEffect } from 'react'
import { formatEuro, fullName, initials, playerStats } from '../lib/stats'
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={fullName(player)} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
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
          <div className="stat-pill"><span className="stat-pill-label">Kasa</span><span className="stat-pill-value">{s.kasa}</span></div>
          <div className="stat-pill"><span className="stat-pill-label">Merenda</span><span className="stat-pill-value">{s.merenda}</span></div>
          <div className="stat-pill stat-pill-pending">
            <span className="stat-pill-label">Da pagare</span>
            <span className="stat-pill-value">{s.pending}{s.pendingEuro > 0 ? ` · ${formatEuro(s.pendingEuro)}` : ''}</span>
          </div>
        </div>
        <FineList data={data} fines={fines} />
      </div>
    </div>
  )
}
