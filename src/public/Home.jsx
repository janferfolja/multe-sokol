import { useMemo, useState } from 'react'
import {
  PODIUM_TITLES, daysSince, multeN, multeWord, plural, formatDate, formatEuro, fullName, initials,
  donationCount, jokersFor, playerStats, priceLabel, fineLabel, seasonOf, seasonsIn, teamTotals,
  KASE_PER_MERENDA, kasaPoints, kasaRanking, kaseWord, merendaWord,
} from '../lib/stats'
import { PAYPAL_POOL_URL } from '../lib/config'
import { PENALTY_DAYS } from '../lib/fines'

export default function Home({ data, onPlayer }) {
  const donations = useMemo(() => data.donations ?? [], [data.donations])
  const seasons = useMemo(() => seasonsIn([...data.fines, ...donations]), [data.fines, donations])
  const [season, setSeason] = useState(seasons[0] ?? 'all')

  const seasonData = useMemo(
    () => (season === 'all'
      ? { ...data, donations }
      : {
          ...data,
          fines: data.fines.filter((f) => seasonOf(f.date) === season),
          donations: donations.filter((d) => seasonOf(d.date) === season),
        }),
    [data, donations, season],
  )
  const stats = useMemo(() => playerStats(seasonData), [seasonData])
  const totals = teamTotals(stats)
  const charityKasa = donationCount(seasonData.donations, 'kasa')
  const charityMerenda = donationCount(seasonData.donations, 'merenda')

  return (
    <>
      <Overdue data={data} onPlayer={onPlayer} />

      <div className="season-bar">
        <label htmlFor="season">Sezona</label>
        <select id="season" value={season} onChange={(e) => setSeason(e.target.value)}>
          {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="all">Vse</option>
        </select>
      </div>

      <div className="stats-total">
        <div className="stats-total-left">
          <h3>Skupaj ekipa</h3>
          <div className="stats-total-numbers">
            <Pill label="Multe" value={totals.count} />
            <Pill label="Euro" value={formatEuro(totals.euro)} gold />
            <Pill label="Kase" value={totals.kasa + charityKasa} sub={charityKasa > 0 ? `🍻 dobrodelne: ${charityKasa}` : null} />
            <Pill label="Merende" value={totals.merenda + charityMerenda} sub={charityMerenda > 0 ? `🍕 dobrodelne: ${charityMerenda}` : null} />
            <Pill label="Neplačane" value={totals.pending} warn />
          </div>
        </div>
        {totals.sponsor && (
          <button className="sponsor-badge" onClick={() => onPlayer(totals.sponsor.player.id)}>
            <span className="sponsor-label">💰 Uradni sponzor</span>
            <span className="sponsor-name">{totals.sponsor.player.alias || fullName(totals.sponsor.player)}</span>
            <span className="sponsor-amount">{formatEuro(totals.sponsor.euro)}</span>
          </button>
        )}
      </div>

      <section className="section">
        <h2 className="section-title"><span className="section-icon">🏆</span>Lestvica</h2>
        {totals.count === 0 ? (
          <p className="empty">V tej sezoni še ni nobene multe. Z zdej.</p>
        ) : (
          <>
            <Podium stats={stats.slice(0, 3)} bonuses={data.bonuses ?? []} onPlayer={onPlayer} />
            <div className="stats-grid">
              {stats.slice(3).map((s) => (
                <PlayerCard key={s.player.id} s={s} max={stats[0].count} bonuses={data.bonuses ?? []} onPlayer={onPlayer} />
              ))}
            </div>
          </>
        )}
      </section>

      <KasaBoard stats={stats} onPlayer={onPlayer} />

      <Legend fineTypes={data.fineTypes} />
    </>
  )
}

// Separate ranking for kase & merende only, scored in kase (1 merenda = 2 kase).
function KasaBoard({ stats, onPlayer }) {
  const ranked = kasaRanking(stats)
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">🍺</span>Lestvica kas in merend</h2>
      <p className="hint">Šteje v kasah: 1 merenda = {KASE_PER_MERENDA} kase.</p>
      {ranked.length === 0 ? (
        <p className="empty">V tej sezoni še ni nobene kase ali merende.</p>
      ) : (
        <ol className="rank-board">
          {ranked.map((s, i) => (
            <RankRow
              key={s.player.id} i={i} player={s.player} onPlayer={onPlayer}
              value={kasaPoints(s)} unit={kaseWord(kasaPoints(s))}
              sub={<>
                {s.kasa > 0 && <span>🍺 {s.kasa} {kaseWord(s.kasa)}</span>}
                {s.merenda > 0 && <span>🍕 {s.merenda} {merendaWord(s.merenda)}</span>}
              </>}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

function RankRow({ i, player, value, unit, sub, onPlayer }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <li>
      <button className="rank-row" onClick={() => onPlayer(player.id)}>
        <span className="rank-pos">{medals[i] ?? i + 1}</span>
        <div className="player-avatar player-avatar-sm">{initials(player)}</div>
        <div className="rank-info">
          <strong>{player.alias || fullName(player)}</strong>
          {player.alias && <span className="rank-sub">{fullName(player)}</span>}
          <span className="rank-sub">{sub}</span>
        </div>
        <div className="player-card-count">
          <span className="player-card-count-num">{value}</span>
          <span className="player-card-count-label">{unit}</span>
        </div>
      </button>
    </li>
  )
}

function Pill({ label, value, sub, gold, warn }) {
  return (
    <div className={`stat-pill ${gold ? 'stat-pill-gold' : ''} ${warn ? 'stat-pill-pending' : ''}`}>
      <span className="stat-pill-label">{label}</span>
      <span className="stat-pill-value">{value}</span>
      {sub && <span className="stat-pill-sub">{sub}</span>}
    </div>
  )
}

function Overdue({ data, onPlayer }) {
  const [expanded, setExpanded] = useState(false)
  const players = new Map(data.players.map((p) => [p.id, p]))
  const types = new Map(data.fineTypes.map((t) => [t.id, t]))
  const unpaid = data.fines.filter((f) => !f.paid && !f.waived).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  if (unpaid.length === 0) return null
  const shown = expanded ? unpaid : unpaid.slice(0, 5)

  return (
    <section className="upcoming-multe">
      <h3><span className="section-icon">🔥</span>Za plačat<span className="count-chip">{unpaid.length}</span></h3>
      <div className="upcoming-multe-list">
        {shown.map((f) => {
          const p = players.get(f.player_id)
          const t = types.get(f.fine_type_id)
          return (
            <button key={f.id} className="upcoming-multa-item" onClick={() => onPlayer(f.player_id)}>
              <div className="player-avatar">{initials(p)}</div>
              <div className="upcoming-info">
                <div className="upcoming-player">{p?.alias || fullName(p)}{p?.alias && <span className="upcoming-fullname"> · {fullName(p)}</span>}</div>
                <div className="upcoming-desc">{t?.name}{f.note ? ` · ${f.note}` : ''}</div>
              </div>
              <div className="upcoming-badges-container">
                <div className={`price-badge price-${t?.kind} ${f.doubled_at ? 'doubled' : ''}`}>{fineLabel(t, f)}</div>
                <div className={`days-overdue-badge ${daysSince(f.date) >= PENALTY_DAYS ? 'late' : ''}`}>
                  {daysSince(f.date) >= 2 * PENALTY_DAYS ? '⏰⏰ ' : daysSince(f.date) >= PENALTY_DAYS ? '⏰ ' : ''}+{daysSince(f.date)} dni
                </div>
                <div className="upcoming-date-badge">{formatDate(f.date)}</div>
              </div>
            </button>
          )
        })}
      </div>
      {unpaid.length > 5 && (
        <button className="btn btn-ghost btn-block" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Pokaži manj' : `Pokaži vse (${unpaid.length})`}
        </button>
      )}
      <div className="paypal-row"><a className="btn btn-paypal" href={PAYPAL_POOL_URL} target="_blank" rel="noopener noreferrer">💳 Plači zs Paypal</a></div>
    </section>
  )
}

function Podium({ stats, bonuses, onPlayer }) {
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
              <div className="podium-name">{s.player.alias || fullName(s.player)}</div>
              {s.player.alias && <div className="podium-alias">{fullName(s.player)}</div>}
              <div className="podium-title">{PODIUM_TITLES[i]}</div>
              <div className="podium-stats">
                <span>{multeN(s.count)}</span><span className="podium-stats-sep">·</span><span>{formatEuro(s.euro)}</span>
              </div>
              <BonusBadges bonuses={bonuses} playerId={s.player.id} />
              {s.pending > 0 && <div className="podium-pending">⚠ {s.pending} {plural(s.pending, 'neplačana', 'neplačane')}</div>}
            </div>
            <div className="podium-pedestal"><span className="podium-rank">{i + 1}</span></div>
          </button>
        )
      })}
    </div>
  )
}

function PlayerCard({ s, max, bonuses, onPlayer }) {
  const ratio = max ? s.count / max : 0
  const severity = ratio >= 0.66 ? 'high' : ratio >= 0.33 ? 'mid' : 'low'
  return (
    <button className={`player-card severity-${severity}`} onClick={() => onPlayer(s.player.id)}>
      <div className="player-card-header">
        <div className="player-card-id">
          <div className="player-avatar player-avatar-sm">{initials(s.player)}</div>
          <div className="player-card-names">
            <strong>{s.player.alias || fullName(s.player)}</strong>
            {s.player.alias && <span className="player-card-alias">{fullName(s.player)}</span>}
          </div>
        </div>
        <div className="player-card-count">
          <span className="player-card-count-num">{s.count}</span>
          <span className="player-card-count-label">{multeWord(s.count)}</span>
        </div>
      </div>
      <div className="player-card-stats">
        <Row label="Euro" value={formatEuro(s.euro)} />
        {s.kasa > 0 && <Row label={s.kasa === 1 ? 'Kasa' : 'Kase'} value={s.kasa} />}
        {s.merenda > 0 && <Row label={s.merenda === 1 ? 'Merenda' : 'Merende'} value={s.merenda} />}
      </div>
      <div className="player-card-bar"><div className="player-card-bar-fill" style={{ width: `${ratio * 100}%` }} /></div>
      <BonusBadges bonuses={bonuses} playerId={s.player.id} />
      {s.pending > 0 && <div className="player-card-pending">⚠ {s.pending} {plural(s.pending, 'neplačana', 'neplačane')}</div>}
    </button>
  )
}

function BonusBadges({ bonuses, playerId }) {
  const own = bonuses.filter((b) => b.player_id === playerId)
  if (own.length === 0) return null
  const jokers = jokersFor(bonuses, playerId).length
  return (
    <div className="bonus-badges">
      <span className="bonus-badge">🏅 {own.length}</span>
      {jokers > 0 && <span className="bonus-badge joker">🃏 jolly{jokers > 1 ? ` ×${jokers}` : ''}</span>}
    </div>
  )
}

const Row = ({ label, value }) => (
  <div className="player-stat-row"><span className="player-stat-label">{label}</span><span className="player-stat-value">{value}</span></div>
)

function Legend({ fineTypes }) {
  const active = fineTypes.filter((t) => t.active)
  const groups = [
    ['euro', '💶 Multe v evrih'],
    ['kasa', '🍺 Kasa'],
    ['merenda', '🍕 Merenda'],
  ]
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">📋</span>Legenda mult</h2>
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
      <p className="legend-note"><b>KASA</b> = Kasa bjre · <b>MERENDA</b> = Kasa + Jedača = 2 KASE</p>
    </section>
  )
}
