import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Who is logged in and whether they are an admin. user: undefined = still checking, null = logged out.
// onUser runs after every change (Admin uses it to land on the admin page after an email link).
export function useAdminSession(onUser) {
  const [user, setUser] = useState(undefined)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let alive = true
    const update = async (u) => {
      const ok = u ? await api.isAdmin() : false
      if (!alive) return
      setUser(u)
      setAdmin(ok)
      onUser?.(u)
    }
    api.getUser().then(update)
    const off = api.onAuthChange(update)
    return () => { alive = false; off() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, admin }
}

// Run a write, then refresh data and show a confirmation (or the error).
// Returns [run, toast]: render `toast` somewhere on the page.
export function useRun(reload) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const run = async (fn, message) => {
    try {
      await fn()
      await reload()
      setToast({ kind: 'ok', text: typeof message === 'function' ? message() : message })
      return true
    } catch (e) {
      setToast({ kind: 'err', text: `Napaka: ${e.message}` })
      return false
    }
  }

  const node = toast && <div className={`toast toast-${toast.kind}`} role="status">{toast.text}</div>
  return [run, node]
}
