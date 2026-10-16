import { api } from './api'
import { jokersFor, multeN, plural } from './stats'

// Add fines, letting each player's available jollies cancel them (oldest jolly first, one per fine).
// Returns the confirmation message for the toast.
export async function addFinesWithJolly(rows, bonuses) {
  const free = new Map()
  const use = rows.map((r) => {
    if (!free.has(r.player_id)) free.set(r.player_id, jokersFor(bonuses, r.player_id))
    return free.get(r.player_id).shift() ?? null
  })
  const added = await api.addFines(rows.map((r, i) => (use[i] ? { ...r, waived: true } : r)))
  // Inserted rows come back in the same order as sent.
  for (const [i, f] of (added ?? []).entries()) {
    if (use[i]) await api.saveBonus({ id: use[i].id, used_fine_id: f.id, used_at: new Date().toISOString() })
  }
  const n = rows.length
  const j = use.filter(Boolean).length
  return `${multeN(n)} ${plural(n, 'dodana', 'dodane')} ✓` + (j ? ` · 🃏 ${j} ${plural(j, 'oproščena', 'oproščene')} z jollyjem` : '')
}

// "Ni prnesu multe": level 1 after 14 days unpaid, level 2 after 28 days (the penalty doubles).
export const PENALTY_DAYS = 14
export const PENALTY_LEVELS = [{ level: 1, days: 14 }, { level: 2, days: 28 }]
export const penaltyType = (fineTypes) =>
  fineTypes.find((t) => t.name.trim().toLowerCase() === 'ni prnesu multe')

// Unpaid multe with penalty levels that are due but not given yet: [{ fine, levels: [1, 2] }].
// Penalty fines themselves never trigger another penalty.
export function overdueForPenalty(fines, now = Date.now()) {
  const given = new Map() // fine id -> Set of levels already given
  for (const f of fines) {
    if (f.penalty_for == null) continue
    if (!given.has(f.penalty_for)) given.set(f.penalty_for, new Set())
    given.get(f.penalty_for).add(f.penalty_level ?? 1)
  }
  const ageDays = (f) => (now - new Date(f.date + 'T00:00:00').getTime()) / 86400000
  return fines
    .filter((f) => !f.paid && !f.waived && f.penalty_for == null)
    .map((f) => ({
      fine: f,
      levels: PENALTY_LEVELS.filter((l) => ageDays(f) >= l.days && !given.get(f.id)?.has(l.level)).map((l) => l.level),
    }))
    .filter((x) => x.levels.length > 0)
    .sort((a, b) => a.fine.date.localeCompare(b.fine.date) || a.fine.id - b.fine.id)
}
