import { useEffect, useState } from 'react'

export function useRoute() {
  const read = () => {
    // Magic-link logins land on "?admin"; turn that into the admin route.
    const fromLink = !window.location.hash || window.location.hash.includes('access_token')
    if (fromLink && new URLSearchParams(window.location.search).has('admin')) return 'admin'
    return window.location.hash.replace(/^#\/?/, '') || 'home'
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
