export const fullName = (p) => (p ? `${p.name} ${p.surname}` : '?')
export const initials = (p) => (p ? `${p.name[0] ?? ''}${p.surname[0] ?? ''}`.toUpperCase() : '?')

export const priceLabel = (kind, price) =>
  kind === 'euro' ? `${formatEuro(price)}` : kind === 'kasa' ? 'KASA' : 'MERENDA'

export const formatEuro = (n) => `${Number(n ?? 0).toLocaleString('sl-SI', { maximumFractionDigits: 2 })}€`

export const formatDate = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const daysSince = (iso) => Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000)

// Per-player totals, sorted by number of fines then euros.
export function playerStats({ players, fineTypes, fines }) {
  const typeById = new Map(fineTypes.map((t) => [t.id, t]))
  const byPlayer = new Map(players.map((p) => [p.id, { player: p, count: 0, euro: 0, kasa: 0, merenda: 0, pending: 0, pendingEuro: 0 }]))
  for (const f of fines) {
    if (f.waived) continue // cancelled by a joker: stays in history, counts nowhere
    const s = byPlayer.get(f.player_id)
    const t = typeById.get(f.fine_type_id)
    if (!s || !t) continue
    s.count++
    if (t.kind === 'euro') s.euro += Number(f.amount ?? 0)
    else s[t.kind]++
    if (!f.paid) {
      s.pending++
      if (t.kind === 'euro') s.pendingEuro += Number(f.amount ?? 0)
    }
  }
  return [...byPlayer.values()]
    .filter((s) => s.player.active || s.count > 0)
    .sort((a, b) => b.count - a.count || b.euro - a.euro || a.player.surname.localeCompare(b.player.surname))
}

export function teamTotals(stats) {
  const sum = (k) => stats.reduce((acc, s) => acc + s[k], 0)
  const sponsor = stats.reduce((best, s) => (s.euro > (best?.euro ?? 0) ? s : best), null)
  return { count: sum('count'), euro: sum('euro'), kasa: sum('kasa'), merenda: sum('merenda'), pending: sum('pending'), pendingEuro: sum('pendingEuro'), sponsor }
}

export const PODIUM_TITLES = ['Kralj Mult', 'Princ Mult', 'Smrdljivc']

// Seasons run July → June. "2025/26" for any date from 2025-07-01 to 2026-06-30.
export const seasonOf = (iso) => {
  const y = Number(iso.slice(0, 4))
  const start = Number(iso.slice(5, 7)) >= 7 ? y : y - 1
  return `${start}/${String(start + 1).slice(2)}`
}

export const seasonsIn = (fines) => [...new Set(fines.map((f) => seasonOf(f.date)))].sort().reverse()

// Team usage: 1 multa (plačana), any other number multe (plačane). Same for kasa/kase.
export const plural = (n, one, many) => (n === 1 ? one : many)
export const multeWord = (n) => plural(n, 'multa', 'multe')
export const multeN = (n) => `${n} ${multeWord(n)}`

export const donationKasa = (donations) => donations.reduce((n, d) => n + (d.quantity ?? 1), 0)
export const donorName = (d, players) =>
  d.player_id != null ? fullName(players.find((p) => p.id === d.player_id)) : d.donor_name || 'Anonimno'

// Team usage: 1 kasa, more kase.
export const kaseWord = (n) => plural(n, 'kasa', 'kase')
export const merendaWord = (n) => plural(n, 'merenda', 'merende')

// Donations are a kasa unless the row says otherwise (rows from before the merenda option).
export const donationKind = (d) => d.kind ?? 'kasa'
export const donationCount = (donations, kind) =>
  donations.filter((d) => donationKind(d) === kind).reduce((n, d) => n + (d.quantity ?? 1), 0)
export const donationLabel = (d) => {
  const q = d.quantity ?? 1
  return `${q} ${(donationKind(d) === 'merenda' ? merendaWord(q) : kaseWord(q)).toUpperCase()}`
}

// Bonuses: a joker ("skip_next") is available until it has cancelled a multa.
export const isJoker = (b) => b.reward_kind === 'skip_next'
export const bonusAvailable = (b) => (isJoker(b) ? b.used_fine_id == null && !b.used_at : !b.used_at)
export const jokersFor = (bonuses, playerId) =>
  bonuses.filter((b) => b.player_id === playerId && isJoker(b) && bonusAvailable(b))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
export const rewardLabel = (b) => (isJoker(b) ? '🃏 Jolly: preklic naslednje multe' : `🎁 ${b.reward}`)
