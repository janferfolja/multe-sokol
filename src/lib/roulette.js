import { api } from './api'
import { insertFinesWithJolly } from './fines'
import { fineLabel, formatDate, fullName, todayISO } from './stats'

// Roulette: every new multa gives the player a coin (admins can also hand coins out); an admin
// spends a coin to spin for the player. Every outcome is about multe and only hits the spinner;
// with "pay_other" another player is involved, and they can only gain.
//
// "This multa" = the multa the coin came from; for a hand-given coin, the player's oldest open one.

export const EFFECTS = {
  waive_this: { kind: 'bonus', label: '😇 Ta multa je oproščena' },
  half_this: { kind: 'bonus', label: '✂️ Ta multa za pol cene (samo euro multe)' },
  jolly: { kind: 'bonus', label: '🃏 Naslednja multa oproščena (jolly)' },
  none: { kind: 'neutral', label: '🤷 Nič se ne spremeni' },
  double_this: { kind: 'malus', label: '⏫ Ta multa šteje dvojno' },
  extra_fine: { kind: 'malus', label: '➕ Dodatna multa' },
  pay_other: { kind: 'malus', label: '💸 Plača multo drugemu (izbere ga druga roulette)' },
}
export const KINDS = [['bonus', '🍀 Bonusi'], ['neutral', '🤷 Nevtralno'], ['malus', '💀 Malusi']]
export const kindOf = (o) => EFFECTS[o.effect]?.kind ?? 'neutral'

export const outcomeLabel = (o) => `${o.emoji ? `${o.emoji} ` : ''}${o.name}`
export const effectLabel = (o, fineTypes) =>
  o.effect === 'extra_fine'
    ? `➕ Dodatna multa: ${fineTypes.find((t) => t.id === o.fine_type_id)?.name ?? '?'}`
    : EFFECTS[o.effect]?.label ?? ''

const isOpen = (f) => f != null && !f.paid && !f.waived
const byDate = (a, b) => a.date.localeCompare(b.date) || a.id - b.id
const shortDate = (iso) => formatDate(iso).slice(0, 5)

// ── Coins ───────────────────────────────────────────────────────────────

// Unspent coins: Map(player_id → [{ key, fine } | { key, coin }]), oldest first.
// A multa is a coin unless it was imported, a jolly cancelled it, or the roulette itself gave it.
export function coinsByPlayer({ fines, bonuses = [], spins = [], coins = [] }) {
  const notNull = (x) => x != null
  const usedFines = new Set(spins.map((s) => s.fine_id).filter(notNull))
  const usedCoins = new Set(spins.map((s) => s.coin_id).filter(notNull))
  const fromSpin = new Set(spins.map((s) => s.new_fine_id).filter(notNull))
  const jollied = new Set(bonuses.map((b) => b.used_fine_id).filter(notNull))
  const m = new Map()
  const add = (pid, c) => (m.get(pid) ?? m.set(pid, []).get(pid)).push(c)
  for (const f of fines) {
    if (f.created_by === 'import' || fromSpin.has(f.id) || jollied.has(f.id) || usedFines.has(f.id)) continue
    add(f.player_id, { key: `f${f.id}`, fine: f, date: f.date })
  }
  for (const c of coins) if (!usedCoins.has(c.id)) add(c.player_id, { key: `c${c.id}`, coin: c, date: c.created_at.slice(0, 10) })
  for (const list of m.values()) list.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
  return m
}

export const coinLabel = (c, data) => {
  if (c.coin) return `🪙 ${c.coin.reason || 'Podarjen kovanec'}`
  const t = data.fineTypes.find((x) => x.id === c.fine.fine_type_id)
  return `${t?.name ?? '?'} · ${fineLabel(t, c.fine)} · ${shortDate(c.fine.date)}`
}

// The multa an outcome like "this multa is forgiven" works on.
export function targetFine(data, playerId, coin) {
  if (coin?.fine) return data.fines.find((f) => f.id === coin.fine.id) ?? null
  return data.fines.filter((f) => f.player_id === playerId && isOpen(f)).sort(byDate)[0] ?? null
}

// pay_other: every other player with an open multa, with the oldest one (the one that gets paid).
export function payCandidates(data, playerId) {
  const oldest = new Map()
  for (const f of [...data.fines].sort(byDate)) {
    if (f.player_id !== playerId && isOpen(f) && !oldest.has(f.player_id)) oldest.set(f.player_id, f)
  }
  return data.players.filter((p) => oldest.has(p.id)).map((p) => ({ player: p, fine: oldest.get(p.id) }))
}

// Can this outcome do anything for this spin? Ones that can't are left off the wheel.
export function applies(o, { target, candidates, fineTypes }) {
  const type = target && fineTypes.find((t) => t.id === target.fine_type_id)
  switch (o.effect) {
    case 'waive_this': return isOpen(target)
    case 'half_this': return isOpen(target) && type?.kind === 'euro' && Number(target.amount) > 0
    case 'double_this': return isOpen(target) && !target.doubled_at
    case 'pay_other': return candidates.length > 0
    case 'extra_fine': return fineTypes.some((t) => t.id === o.fine_type_id)
    default: return true
  }
}

// ── Wheel ───────────────────────────────────────────────────────────────

// Outcomes on the wheel, in wheel order: active ones with a chance, kinds alternating so colours mix.
export function wheelOutcomes(outcomes = []) {
  const on = outcomes.filter((o) => o.active && Number(o.chance) > 0).map((o) => ({ ...o, kind: kindOf(o) }))
  const groups = ['bonus', 'malus', 'neutral'].map((k) => on.filter((o) => o.kind === k))
  const out = []
  for (let i = 0; out.length < on.length; i++) for (const g of groups) if (g[i]) out.push(g[i])
  return out
}

export const totalChance = (items) => items.reduce((n, o) => n + Number(o.chance), 0)

// Real chance of an outcome on this wheel, in %. Chances that don't add up to 100 are scaled to fit.
export const realPercent = (o, wheel) => {
  const total = totalChance(wheel)
  return total > 0 && wheel.some((x) => x.id === o.id) ? (Number(o.chance) / total) * 100 : 0
}
export const formatPercent = (n) => `${Number(n).toLocaleString('sl-SI', { maximumFractionDigits: 1 })} %`

// Weighted random pick, using the browser's crypto randomness.
export function pickOutcome(wheel) {
  const total = totalChance(wheel)
  const r = (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * total
  let acc = 0
  for (const o of wheel) {
    acc += Number(o.chance)
    if (r < acc) return o
  }
  return wheel.at(-1)
}

// ── Saving and undoing ──────────────────────────────────────────────────

// Spend `coin` on `outcome` and apply it. `other` = { player, fine } for pay_other.
// Returns a short description of what happened.
export async function saveSpin(data, playerId, coin, outcome, other) {
  const target = targetFine(data, playerId, coin)
  const spin = {
    player_id: playerId, outcome_id: outcome.id, name: outcome.name, emoji: outcome.emoji || null,
    kind: kindOf(outcome), effect: outcome.effect, fine_id: coin.fine?.id ?? null, coin_id: coin.coin?.id ?? null,
  }
  const rollback = []
  const addFine = async (row) => {
    const { added, jollies } = await insertFinesWithJolly([{ player_id: playerId, date: todayISO(), ...row }], data.bonuses ?? [])
    const f = added[0]
    if (f) rollback.push(() => api.deleteFines([f.id]))
    spin.new_fine_id = f?.id ?? null
    return jollies > 0 ? ' (🃏 jolly jo je oprostil)' : ''
  }
  let msg = ''
  try {
    switch (outcome.effect) {
      case 'waive_this':
        await api.updateFine(target.id, { waived: true })
        rollback.push(() => api.updateFine(target.id, { waived: false }))
        spin.target_fine_id = target.id
        msg = '😇 Multa oproščena'
        break
      case 'half_this': {
        const prev = Number(target.amount)
        await api.updateFine(target.id, { amount: Math.round((prev / 2) * 100) / 100 })
        rollback.push(() => api.updateFine(target.id, { amount: prev }))
        Object.assign(spin, { target_fine_id: target.id, prev_amount: prev })
        msg = '✂️ Multa za pol cene'
        break
      }
      case 'double_this':
        await api.updateFine(target.id, { doubled_at: new Date().toISOString() })
        rollback.push(() => api.updateFine(target.id, { doubled_at: null }))
        spin.target_fine_id = target.id
        msg = '⏫ Multa šteje dvojno'
        break
      case 'jolly': {
        const b = await api.saveBonus({ date: todayISO(), player_id: playerId, reason: '🎰 Roulette', reward_kind: 'skip_next', reward: null })
        if (b) rollback.push(() => api.deleteBonus(b.id))
        spin.bonus_id = b?.id ?? null
        msg = '🃏 Jolly za naslednjo multo'
        break
      }
      case 'extra_fine':
        msg = '➕ Dodatna multa' + (await addFine({ fine_type_id: outcome.fine_type_id, note: `🎰 Roulette: ${outcomeLabel(outcome)}` }))
        break
      case 'pay_other': {
        const { player: op, fine: of } = other
        await api.updateFine(of.id, { waived: true })
        rollback.push(() => api.updateFine(of.id, { waived: false }))
        Object.assign(spin, { target_fine_id: of.id, other_player_id: op.id })
        msg = `💸 Plača multo za ${op.alias || fullName(op)}` + (await addFine({
          fine_type_id: of.fine_type_id, amount: of.amount, doubled_at: of.doubled_at ?? null,
          note: `🎰 plača za ${fullName(op)} (multa z dne ${formatDate(of.date)})`,
        }))
        break
      }
    }
    await api.addSpin(spin)
  } catch (e) {
    // Don't leave half a spin behind.
    for (const step of rollback.reverse()) await step().catch(() => {})
    throw e
  }
  return msg
}

// Undo a spin: the coin comes back and everything the spin changed is put back.
export async function undoSpin(spin, data) {
  const t = spin.target_fine_id
  if (spin.new_fine_id != null) await api.deleteFines([spin.new_fine_id])
  if (t != null) {
    if (spin.effect === 'waive_this' || spin.effect === 'pay_other') await api.updateFine(t, { waived: false })
    if (spin.effect === 'half_this' && spin.prev_amount != null) await api.updateFine(t, { amount: Number(spin.prev_amount) })
    if (spin.effect === 'double_this') await api.updateFine(t, { doubled_at: null })
  }
  if (spin.bonus_id != null) {
    const b = (data.bonuses ?? []).find((x) => x.id === spin.bonus_id)
    // A jolly that already cancelled a multa: that multa counts again.
    if (b?.used_fine_id != null) await api.updateFine(b.used_fine_id, { waived: false })
    await api.deleteBonus(spin.bonus_id)
  }
  await api.deleteSpin(spin.id)
}

// ── Showing it ──────────────────────────────────────────────────────────

// What a spin did, in one line: "Zgrešen zicer (12/11) oproščena".
export function spinDetail(s, data) {
  const fine = (id) => data.fines.find((f) => f.id === id)
  const typeName = (f) => data.fineTypes.find((t) => t.id === f?.fine_type_id)?.name ?? 'multa'
  const what = (f) => (f ? `${typeName(f)} (${shortDate(f.date)})` : 'multa')
  const t = fine(s.target_fine_id)
  const other = data.players.find((p) => p.id === s.other_player_id)
  switch (s.effect) {
    case 'waive_this': return `${what(t)} oproščena`
    case 'half_this': return `${what(t)} za pol cene`
    case 'double_this': return `${what(t)} šteje dvojno`
    case 'jolly': return 'jolly za naslednjo multo'
    case 'extra_fine': return `dodatna multa: ${typeName(fine(s.new_fine_id))}`
    case 'pay_other': return `plača ${other ? fullName(other) : '?'} multo: ${what(t)}`
    default: return 'brez sprememb'
  }
}

// For a multa a spin forgave or paid for: the badge text, else null.
export function spinWaiveBadge(f, data) {
  const s = (data.spins ?? []).find((x) => x.target_fine_id === f.id && (x.effect === 'waive_this' || x.effect === 'pay_other'))
  if (!s) return null
  if (s.effect === 'waive_this') return '🎰 Oproščena'
  const p = data.players.find((x) => x.id === s.player_id)
  return `🎰 Plača ${p?.alias || p?.name || '?'}`
}
