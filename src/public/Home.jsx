import { useMemo, useState } from 'react'
import {
  PODIUM_TITLES, daysSince, formatDate, formatEuro, fullName, initials,
  playerStats, priceLabel, seasonOf, seasonsIn, teamTotals,
} from '../lib/stats'

export default function Home({ data, onPlayer }) {
  const seasons = useMemo(() => seasonsIn(data.fines), [data.fines])
  const [season, setSeason] = useState(seasons[0] ?? 'all')

  const seasonData = useMemo(
    () => (season === 'all' ? data : { ...data, fines: data.fines.filter((f) => seasonOf(f.date) === season) }),
    [data, season],
  )
  const stats = useMemo(() => playerStats(seasonData), [seasonData])
  const totals = teamTotals(stats)

  return (
    <>
      <Overdue data={data} onPlayer={onPlayer} />

      <div className="season-bar">
        <label htmlFor="season">Stagione</label>
        <select id="season" value={season} onChange={(e) => setSeason(e.target.value)}>
          {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="all">Tutte</option>
        </select>
      </div>

      <div className="stats-total">
        <div className="stats-total-left">
          <h3>Totale squadra</h3>
          <div className="stats-total-numbers">
            <Pill label="Multe" value={totals.count} />
            <Pill label="Euro" value={formatEuro(totals.euro)} gold />
            <Pill label="Kasa" value={totals.kasa} />
            <Pill label="Merenda" value={totals.merenda} />
            <Pill label="In sospeso" value={totals.pending} warn />
          </div>
        </div>
        {totals.sponsor && (
          <button className="sponsor-badge" onClick={() => onPlayer(totals.sponsor.player.id)}>
            <span className="sponsor-label">💰 Sponsor ufficiale</span>
            <span className="sponsor-name">{fullName(totals.sponsor.player)}</span>
            <span className="sponsor-amount">{formatEuro(totals.sponsor.euro)}</span>
          </button>
        )}
      </div>

      <section className="section">
        <h2 className="section-title"><span className="section-icon">🏆</span>Classifica multe</h2>
        {totals.count === 0 ? (
          <p className="empty">Nessuna multa in questa stagione. Per ora.</p>
        ) : (
          <>
            <Podium stats={stats.slice(0, 3)} onPlayer={onPlayer} />
            <div className="stats-grid">
              {stats.slice(3).map((s) => (
                <PlayerCard key={s.player.id} s={s} max={stats[0].count} onPlayer={onPlayer} />
              ))}
            </div>
          </>
        )}
      </section>

      <Legend fineTypes={data.fineTypes} />
    </>
  )
}

function Pill({ label, value, gold, warn }) {
  return (
    <div className={`stat-pill ${gold ? 'stat-pill-gold' : ''} ${warn ? 'stat-pill-pending' : ''}`}>
      <span className="stat-pill-label">{label}</span>
      <span className="stat-pill-value">{value}</span>
    </div>
  )
}

function Overdue({ data, onPlayer }) {
  const [expanded, setExpanded] = useState(false)
  const players = new Map(data.players.map((p) => [p.id, p]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))
  const unpaid = data.fines.filter((f) => !f.paid).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  if (unpaid.length === 0) return null
  const shown = expanded ? unpaid : unpaid.slice(0, 5)

  return (
    <section className="upcoming-multe">
      <h3><span className="section-icon">🔥</span>Da recuperare<span className="count-chip">{unpaid.length}</span></h3>
      <div className="upcoming-multe-list">
        {shown.map((f) => {
          const p = players.get(f.player_id)
          const t = types.get(f.fine_type_id)
          return (
            <button key={f.id} className="upcoming-multa-item" onClick={() => onPlayer(f.player_id)}>
              <div className="player-avatar">{initials(p)}</div>
              <div className="upcoming-info">
                <div className="upcoming-player">{fullName(p)}</div>
                <div className="upcoming-desc">{t?.name}{f.note ? ` · ${f.note}` : ''}</div>
              </div>
              <div className="upcoming-badges-container">
                <div className={`price-badge price-${t?.kind}`}>{t && priceLabel(t.kind, f.amount)}</div>
                <div className="days-overdue-badge">+{daysSince(f.date)} dni</div>
                <div className="upcoming-date-badge">{formatDate(f.date)}</div>
              </div>
            </button>
          )
        })}
      </div>
      {unpaid.length > 5 && (
        <button className="btn btn-ghost btn-block" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Mostra meno' : `Mostra tutte (${unpaid.length})`}
        </button>
      )}
    </section>
  )
}

function Podium({ stats, onPlayer }) {
  const order = [1, 0, 2] // silver, gold, bronze
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="podium">
      {order.map((i) => {
        const s = stats[i]
        if (!s) return <div key={i} className={`podium-slot podium-slot-${i + 1}`} />
        return (
          <button key={i} className={`podium-slot podium-slot-${i + 1}`} onClick={() => onPlayer(s.player.id)}>
            <div className="podium-card">
              <div className="podium-emoji">{medals[i]}</div>
              <div className="podium-name">{fullName(s.player)}</div>
              {s.player.alias && <div className="podium-alias">"{s.player.alias}"</div>}
              <div className="podium-title">{PODIUM_TITLES[i]}</div>
              <div className="podium-stats">
                <span>{s.count} multe</span><span className="podium-stats-sep">·</span><span>{formatEuro(s.euro)}</span>
              </div>
              {s.pending > 0 && <div className="podium-pending">⚠ {s.pending} in sospeso</div>}
            </div>
            <div className="podium-pedestal"><span className="podium-rank">{i + 1}</span></div>
          </button>
        )
      })}
    </div>
  )
}

function PlayerCard({ s, max, onPlayer }) {
  const ratio = max ? s.count / max : 0
  const severity = ratio >= 0.66 ? 'high' : ratio >= 0.33 ? 'mid' : 'low'
  return (
    <button className={`player-card severity-${severity}`} onClick={() => onPlayer(s.player.id)}>
      <div className="player-card-header">
        <div className="player-card-id">
          <div className="player-avatar player-avatar-sm">{initials(s.player)}</div>
          <div className="player-card-names">
            <strong>{fullName(s.player)}</strong>
            {s.player.alias && <span className="player-card-alias">"{s.player.alias}"</span>}
          </div>
        </div>
        <div className="player-card-count">
          <span className="player-card-count-num">{s.count}</span>
          <span className="player-card-count-label">multe</span>
        </div>
      </div>
      <div className="player-card-stats">
        <Row label="Euro" value={formatEuro(s.euro)} />
        {s.kasa > 0 && <Row label="Kasa" value={s.kasa} />}
        {s.merenda > 0 && <Row label="Merenda" value={s.merenda} />}
      </div>
      <div className="player-card-bar"><div className="player-card-bar-fill" style={{ width: `${ratio * 100}%` }} /></div>
      {s.pending > 0 && <div className="player-card-pending">⚠ {s.pending} in sospeso</div>}
    </button>
  )
}

const Row = ({ label, value }) => (
  <div className="player-stat-row"><span className="player-stat-label">{label}</span><span className="player-stat-value">{value}</span></div>
)

function Legend({ fineTypes }) {
  const active = fineTypes.filter((t) => t.active)
  const groups = [
    ['euro', '💶 Multe in euro'],
    ['kasa', '🍺 Kasa'],
    ['merenda', '🍕 Merenda'],
  ]
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">📋</span>Legenda multe</h2>
      <div className="legend-groups">
        {groups.map(([kind, title]) => (
          <div key={kind} className="legend-group">
            <h4>{title}</h4>
            {active
              .filter((t) => t.kind === kind)
              .sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || a.name.localeCompare(b.name))
              .map((t) => (
                <div key={t.id} className="legend-row">
                  <span>{t.name}</span>
                  <span className={`legend-price legend-${kind}`}>{priceLabel(kind, t.price)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
      <p className="legend-note"><b>KASA</b> = Kasa bjre · <b>MERENDA</b> = Kasa + Jedača</p>
    </section>
  )
}
