import { useEffect, useState } from 'react'

// Links from Supabase emails (invite, password recovery) land as "#access_token=…&type=invite".
// Read the type now, before supabase-js consumes and clears the hash.
const linkParams = new URLSearchParams(window.location.hash.slice(1))
export const authLinkType = linkParams.has('access_token') ? linkParams.get('type') : null

export function useRoute() {
  const read = () => {
    const hash = window.location.hash
    if (hash.includes('access_token') || (authLinkType && !hash.replace(/^#\/?/, ''))) return 'admin'
    if (!hash && new URLSearchParams(window.location.search).has('admin')) return 'admin'
    return hash.replace(/^#\/?/, '') || 'home'
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(route) {
  if (window.location.search) {
    // Drop "?admin" left over from the magic-link redirect.
    window.history.replaceState(null, '', window.location.pathname + `#/${route}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = `/${route}`
  }
  window.scrollTo(0, 0)
}
