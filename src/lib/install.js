import { useEffect, useState } from 'react'

// Chrome/Android fires this once, often before the install page is open, so catch it at startup.
let deferredPrompt = null
const listeners = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  listeners.forEach((cb) => cb())
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  listeners.forEach((cb) => cb())
})

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const platform = () => {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const cb = () => force((n) => n + 1)
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, [])
  return {
    canPrompt: !!deferredPrompt,
    async prompt() {
      if (!deferredPrompt) return false
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      deferredPrompt = null
      force((n) => n + 1)
      return outcome === 'accepted'
    },
  }
}
