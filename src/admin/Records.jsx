import { formatDate, fullName, initials, isRecordType, pointsRecords, tockeWord } from '../lib/stats'

// Each player's "Osebni rekord punti": current record and the records before it.
export default function Records({ data }) {
  const recordTypeIds = new Set(data.fineTypes.filter(isRecordType).map((t) => t.id))
  const recordFines = data.fines.filter((f) => recordTypeIds.has(f.fine_type_id))
  const best = pointsRecords(recordFines)
  const rows = data.players
    .filter((p) => p.active || recordFines.some((f) => f.player_id === p.id))
    .map((p) => {
      const own = recordFines.filter((f) => f.player_id === p.id)
      const history = own.filter((f) => f.points != null).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      return { player: p, record: best.get(p.id), history, missing: own.length - history.length }
    })
    .sort((a, b) => (b.record?.points ?? -1) - (a.record?.points ?? -1) || fullName(a.player).localeCompare(fullName(b.player)))

  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">🎯</span>Rekordi točk</h2>
      <p className="hint">
        Točke se vpišejo pri dodajanju multe »Osebni rekord punti«. Starim multam brez točk jih dodaš v Arhivu (✎).
      </p>
      <div className="manage-list">
        {rows.map(({ player, record, history, missing }) => (
          <div key={player.id} className={`manage-row ${player.active ? '' : 'inactive'}`}>
            <div className="player-avatar player-avatar-sm">{initials(player)}</div>
            <div className="grow">
              <b>{fullName(player)}</b>
              <div className="muted small">
                {record ? `${formatDate(record.date)}` : 'še brez rekorda'}
                {history.length > 1 && ` · ${history.map((f) => f.points).join(' → ')}`}
                {missing > 0 && <span className="points-warn"> · {missing}× brez točk</span>}
              </div>
            </div>
            {record ? (
              <span className="record-points">{record.points} <span className="muted">{tockeWord(record.points)}</span></span>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
