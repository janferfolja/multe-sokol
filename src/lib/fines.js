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

// Unpaid multe: after 14 days a "Ni prnesu multe" penalty (level 1);
// after 28 days the multa itself doubles (level 2: doubled_at, counts twice).
export const PENALTY_DAYS = 14
export const DOUBLE_DAYS = 28
export const penaltyType = (fineTypes) =>
  fineTypes.find((t) => t.name.trim().toLowerCase() === 'ni prnesu multe')

// Unpaid multe with steps due but not done yet: [{ fine, levels: [1, 2] }].
// Penalty fines themselves never get a penalty or doubling.
export function overdueForPenalty(fines, now = Date.now()) {
  const penalised = new Set(fines.filter((f) => f.penalty_for != null).map((f) => f.penalty_for))
  const ageDays = (f) => (now - new Date(f.date + 'T00:00:00').getTime()) / 86400000
  return fines
    .filter((f) => !f.paid && !f.waived && f.penalty_for == null)
    .map((f) => ({
      fine: f,
      levels: [
        ...(ageDays(f) >= PENALTY_DAYS && !penalised.has(f.id) ? [1] : []),
        ...(ageDays(f) >= DOUBLE_DAYS && !f.doubled_at ? [2] : []),
      ],
    }))
    .filter((x) => x.levels.length > 0)
    .sort((a, b) => a.fine.date.localeCompare(b.fine.date) || a.fine.id - b.fine.id)
}

// Do the due steps: add penalty fines (jolly applies) and double the 28+ day multe.
export async function applyPenalties(items, type, bonuses, today) {
  const penaltyRows = items.filter((d) => d.levels.includes(1)).map(({ fine }) => ({
    player_id: fine.player_id, fine_type_id: type.id, date: today, penalty_for: fine.id,
    note: `za multo z dne ${fine.date.split('-').reverse().join('/')}`,
  }))
  const toDouble = items.filter((d) => d.levels.includes(2)).map((d) => d.fine)
  const parts = []
  if (penaltyRows.length) parts.push(await addFinesWithJolly(penaltyRows, bonuses))
  const now = new Date().toISOString()
  for (const f of toDouble) await api.updateFine(f.id, { doubled_at: now })
  if (toDouble.length) parts.push(`⏰⏰ ${toDouble.length} ${plural(toDouble.length, 'podvojena', 'podvojene')}`)
  return parts.join(' · ')
}
