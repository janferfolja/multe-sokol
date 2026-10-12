// Data access. Uses Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set,
// otherwise a local demo backend (seeded with the imported data, saved in localStorage).
import { createClient } from '@supabase/supabase-js'
import demoSeed from './demo-data.json'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemo = !url || !key

function supabaseApi() {
  const sb = createClient(url, key, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true } })
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }

  return {
    async load() {
      const [players, fineTypes, fines, donations] = await Promise.all([
        sb.from('players').select('*').order('surname').then(check),
        sb.from('fine_types').select('*').order('id').then(check),
        sb.from('fines').select('*').order('date', { ascending: false }).order('id', { ascending: false }).then(check),
        // Tolerate the donations table not existing yet (migration not run): show none.
        sb.from('donations').select('*').order('date', { ascending: false }).order('id', { ascending: false })
          .then(({ data, error }) => (error ? [] : data)),
      ])
      return { players, fineTypes, fines, donations }
    },

    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session?.user ?? null
    },
    onAuthChange(cb) {
      // Deferred: calling other supabase methods inside this callback can deadlock.
      const { data } = sb.auth.onAuthStateChange((_event, session) => setTimeout(() => cb(session?.user ?? null), 0))
      return () => data.subscription.unsubscribe()
    },
    // Email + password: admin accounts are created in the Supabase dashboard, so no emails are ever sent.
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(/invalid login credentials/i.test(error.message) ? 'Napačen e-naslov ali geslo.' : error.message)
    },
    async changePassword(password) {
      check(await sb.auth.updateUser({ password }))
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async isAdmin() {
      const { data } = await sb.rpc('is_admin')
      return data === true
    },

    addFines: async (rows) => check(await sb.from('fines').insert(rows).select()),
    updateFine: async (id, patch) => check(await sb.from('fines').update(patch).eq('id', id)),
    deleteFines: async (ids) => check(await sb.from('fines').delete().in('id', ids)),
    addDonation: async (row) => check(await sb.from('donations').insert(row)),
    deleteDonation: async (id) => check(await sb.from('donations').delete().eq('id', id)),
    setPaid: async (ids, paid) => check(await sb.from('fines').update({ paid }).in('id', ids)),
    savePlayer: async ({ id, ...p }) =>
      check(id ? await sb.from('players').update(p).eq('id', id) : await sb.from('players').insert(p)),
    saveFineType: async ({ id, ...t }) =>
      check(id != null ? await sb.from('fine_types').update(t).eq('id', id) : await sb.from('fine_types').insert(t)),
  }
}

function demoApi() {
  const STORE = 'multe-sokol-demo'
  let db
  try { db = JSON.parse(localStorage.getItem(STORE)) } catch { /* ignore */ }
  db ||= structuredClone(demoSeed)
  db.donations ||= []
  let user = null
  try { user = JSON.parse(sessionStorage.getItem(STORE + '-user')) } catch { /* ignore */ }
  const listeners = new Set()

  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(db)) } catch { /* ignore */ } }
  const nextId = (rows) => Math.max(0, ...rows.map((r) => r.id)) + 1
  const setUser = (u) => {
    user = u
    try { sessionStorage.setItem(STORE + '-user', JSON.stringify(u)) } catch { /* ignore */ }
    listeners.forEach((cb) => cb(u))
  }
  const priceOf = (typeId) => db.fineTypes.find((t) => t.id === typeId)?.price ?? null

  return {
    async load() {
      const fines = [...db.fines].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      const donations = [...db.donations].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      return structuredClone({ players: db.players, fineTypes: db.fineTypes, fines, donations })
    },
    getUser: async () => user,
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    signIn: async (email) => setUser({ email }),
    changePassword: async () => {},
    signOut: async () => setUser(null),
    isAdmin: async () => !!user,

    async addFines(rows) {
      const now = new Date().toISOString()
      for (const r of rows) {
        db.fines.push({
          id: nextId(db.fines), amount: priceOf(r.fine_type_id), note: null, paid: false, paid_at: null,
          created_at: now, created_by: user?.email, ...r,
        })
      }
      save()
    },
    async updateFine(id, patch) {
      const f = db.fines.find((x) => x.id === id)
      if (patch.fine_type_id != null && patch.fine_type_id !== f.fine_type_id && patch.amount === undefined) {
        patch = { ...patch, amount: priceOf(patch.fine_type_id) }
      }
      Object.assign(f, patch)
      save()
    },
    async addDonation(row) {
      db.donations.push({ id: nextId(db.donations), quantity: 1, created_at: new Date().toISOString(), created_by: user?.email, ...row })
      save()
    },
    async deleteDonation(id) {
      db.donations = db.donations.filter((d) => d.id !== id)
      save()
    },
    async deleteFines(ids) {
      db.fines = db.fines.filter((f) => !ids.includes(f.id))
      save()
    },
    async setPaid(ids, paid) {
      const now = new Date().toISOString()
      for (const f of db.fines) if (ids.includes(f.id)) Object.assign(f, { paid, paid_at: paid ? now : null })
      save()
    },
    async savePlayer(p) {
      if (p.id) Object.assign(db.players.find((x) => x.id === p.id), p)
      else db.players.push({ active: true, ...p, id: nextId(db.players) })
      save()
    },
    async saveFineType(t) {
      if (t.id != null) Object.assign(db.fineTypes.find((x) => x.id === t.id), t)
      else db.fineTypes.push({ active: true, ...t, id: nextId(db.fineTypes) })
      save()
    },
    resetDemo() {
      try { localStorage.removeItem(STORE) } catch { /* ignore */ }
      db = { ...structuredClone(demoSeed), donations: [] }
    },
  }
}

export const api = isDemo ? demoApi() : supabaseApi()
