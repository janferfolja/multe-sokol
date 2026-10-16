import { useEffect, useRef, useState } from 'react'
import { go } from './router'

// Pages reachable by swiping, left to right.
export const SWIPE_PAGES = ['home', 'multe', 'admin']

const EDGE = 24          // px from the screen edge left to the phone's own back gesture
const MIN_DX = 70        // px of horizontal travel needed
const MAX_MS = 700       // a swipe, not a slow drag
const IGNORE = 'input, textarea, select, [contenteditable], .modal-backdrop, [data-noswipe]'

// Swipe left → next page, swipe right → previous. Returns the direction of the last
// swipe-triggered move ('left' | 'right' | null) so the page can slide in from that side.
export function useSwipeNav(route) {
  const [dir, setDir] = useState(null)
  const routeRef = useRef(route)
  routeRef.current = route

  useEffect(() => {
    let start = null
    const onStart = (e) => {
      const t = e.touches[0]
      start = null
      if (e.touches.length !== 1) return
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return
      if (e.target.closest?.(IGNORE) || document.querySelector('.modal-backdrop')) return
      start = { x: t.clientX, y: t.clientY, at: Date.now() }
    }
    const onEnd = (e) => {
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const quick = Date.now() - start.at < MAX_MS
      start = null
      if (!quick || Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.8) return
      if (window.getSelection?.().toString()) return // selecting text, not swiping
      const i = SWIPE_PAGES.indexOf(routeRef.current)
      if (i === -1) return
      const next = SWIPE_PAGES[i + (dx < 0 ? 1 : -1)]
      if (!next) return
      setDir(dx < 0 ? 'left' : 'right')
      go(next === 'home' ? '' : next)
    }
    const onCancel = () => { start = null }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  // Forget the direction once the slide-in has played, so tapping the menu doesn't animate.
  useEffect(() => {
    if (!dir) return
    const t = setTimeout(() => setDir(null), 300)
    return () => clearTimeout(t)
  }, [dir, route])

  return dir
}
