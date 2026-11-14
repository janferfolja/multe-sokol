import { useImperativeHandle, useMemo, useRef, useState } from 'react'
import { totalChance } from '../lib/roulette'

// The roulette wheel. Slices are sized by chance. Pointer at the top.
// Admin spins it through the ref: `await ref.current.spin(outcome)` resolves when it stops.

const R = 92 // slice radius; the rim sits outside it, the viewBox is -110…110
const BULBS = 24
const mod = (a, n) => ((a % n) + n) % n
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180
  return [r * Math.sin(a), -r * Math.cos(a)].map((v) => +v.toFixed(3))
}
const easeOut = (t) => 1 - (1 - t) ** 4

function slicePath(a0, a1) {
  if (a1 - a0 >= 359.999) return `M0 ${-R} A${R} ${R} 0 1 1 0 ${R} A${R} ${R} 0 1 1 0 ${-R}Z`
  const [x0, y0] = pt(a0, R)
  const [x1, y1] = pt(a1, R)
  return `M0 0L${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}Z`
}

const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// Fit a name between the hub and the emoji: one line, or two when the slice is wide enough.
const LABEL_OUT = R * 0.71
const LABEL_IN = 21
function labelLines(name, fs, sweep) {
  const perLine = Math.max(3, Math.floor((LABEL_OUT - LABEL_IN) / (fs * 0.6)))
  if (name.length <= perLine) return [name]
  // two lines need room across the slice: ~2.2 font heights at the label's inner end
  const across = ((LABEL_IN + 14) * sweep * Math.PI) / 180
  if (across < fs * 2.3) return [short(name, perLine)]
  const words = name.split(' ')
  let first = ''
  while (words.length && (first ? `${first} ${words[0]}` : words[0]).length <= perLine) first = first ? `${first} ${words.shift()}` : words.shift()
  if (!first) return [short(name, perLine)]
  return [first, short(words.join(' '), perLine)].filter(Boolean)
}

// Tiny synthesized sounds, so the app needs no audio files.
let audio = null
function beep(freq, dur, type = 'square', vol = 0.04, at = 0) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    const t = audio.currentTime + at
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + dur)
  } catch { /* no audio: fine */ }
}

export default function RouletteWheel({ outcomes, ref, sound = false, compact = false }) {
  const wheelRef = useRef(null)
  const pointerRef = useRef(null)
  const rot = useRef(0) // current angle, used while spinning
  const [rest, setRest] = useState(0) // angle the wheel stopped at, for rendering
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null) // { id, shape }

  const slices = useMemo(() => {
    const total = totalChance(outcomes)
    const out = []
    for (const [i, o] of outcomes.entries()) {
      const a0 = out.at(-1)?.a1 ?? 0
      const sweep = total > 0 ? (Number(o.chance) / total) * 360 : 0
      out.push({ o, i, a0, a1: a0 + sweep, sweep })
    }
    return out
  }, [outcomes])

  // The winner stays highlighted across data reloads, but not once the wheel is edited.
  const shape = slices.map((s) => `${s.o.id}:${s.sweep}`).join()
  const winId = winner?.shape === shape ? winner.id : null

  useImperativeHandle(ref, () => ({
    spin(outcome) {
      const all = slices
      const s = all.find((x) => x.o.id === outcome.id)
      if (!s) return Promise.resolve()
      setWinner(null)
      setSpinning(true)
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      // Land somewhere inside the slice, not right on its edge.
      const margin = Math.min(s.sweep * 0.18, 4)
      const target = s.a0 + margin + Math.random() * (s.sweep - 2 * margin)
      const from = rot.current
      const base = from + 360 * (reduce ? 1 : 6 + Math.floor(Math.random() * 2))
      const to = base + mod(-target - base, 360) // wheel turned so `target` is under the pointer
      const dur = reduce ? 1200 : 6200 + Math.random() * 1200
      const sliceAt = (r) => {
        const local = mod(-r, 360)
        return all.find((x) => local >= x.a0 && local < x.a1)?.i
      }
      let last = sliceAt(from)

      return new Promise((resolve) => {
        const t0 = performance.now()
        const frame = (now) => {
          const t = Math.min(1, (now - t0) / dur)
          const r = from + (to - from) * easeOut(t)
          wheelRef.current?.setAttribute('transform', `rotate(${r})`)
          const cur = sliceAt(r)
          if (cur !== last && all.length > 1) {
            last = cur
            pointerRef.current?.animate(
              [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-22deg)' }, { transform: 'rotate(0deg)' }],
              { duration: 110, easing: 'ease-out' },
            )
            if (sound) beep(1400, 0.03)
            navigator.vibrate?.(6)
          }
          if (t < 1) return requestAnimationFrame(frame)
          rot.current = mod(to, 360)
          wheelRef.current?.setAttribute('transform', `rotate(${rot.current})`)
          setRest(rot.current)
          setSpinning(false)
          setWinner({ id: outcome.id, shape })
          if (sound) {
            if (outcome.kind === 'bonus') [660, 880, 1320].forEach((f, k) => beep(f, 0.18, 'triangle', 0.08, k * 0.11))
            else [220, 165].forEach((f, k) => beep(f, 0.3, 'sawtooth', 0.05, k * 0.2))
          }
          navigator.vibrate?.(outcome.kind === 'bonus' ? [40, 60, 40] : 200)
          resolve()
        }
        requestAnimationFrame(frame)
      })
    },
  }), [slices, shape, sound])

  if (slices.length === 0) {
    return <div className="wheel-empty">Roulette nima aktivnih izidov.</div>
  }

  return (
    <div className={`wheel ${compact ? 'wheel-compact' : ''} ${spinning ? 'spinning' : ''} ${winId != null ? 'has-winner' : ''}`} data-noswipe>
      <svg viewBox="-110 -110 220 220" role="img" aria-label="Roulette">
        <circle r="106" className="wheel-rim" />
        <g ref={wheelRef} transform={`rotate(${rest})`}>
          {slices.map(({ o, i, a0, a1, sweep }) => {
            const mid = (a0 + a1) / 2
            const fs = Math.max(5, Math.min(8.5, sweep * 0.32))
            return (
              <g key={o.id} className={`wheel-slice ${o.kind} ${i % 4 < 2 ? 'a' : 'b'} ${winId === o.id ? 'win' : ''}`}>
                <path d={slicePath(a0, a1)} />
                <g transform={`rotate(${mid - 90})`}>
                  {o.emoji && <text x={R * 0.84} y="0" className="wheel-emoji" fontSize={Math.min(13, Math.max(7, sweep * 0.5))}>{o.emoji}</text>}
                  {sweep >= 13 && !compact && (
                    <text x={LABEL_OUT} y="0" className="wheel-label" fontSize={fs}>
                      {labelLines(o.name, fs, sweep).map((line, k, all) => (
                        <tspan key={k} x={LABEL_OUT} dy={k === 0 ? (all.length > 1 ? -fs * 0.55 : 0) : fs * 1.1}>{line}</tspan>
                      ))}
                    </text>
                  )}
                </g>
              </g>
            )
          })}
          {slices.length > 1 && slices.map(({ o, a0 }) => {
            const [x, y] = pt(a0, R)
            return <line key={o.id} x1="0" y1="0" x2={x} y2={y} className="wheel-divider" />
          })}
        </g>
        {Array.from({ length: BULBS }, (_, k) => {
          const [x, y] = pt((k * 360) / BULBS, 99)
          return <circle key={k} cx={x} cy={y} r="2.6" className={`wheel-bulb ${k % 2 ? 'odd' : 'even'}`} />
        })}
        <circle r="17" className="wheel-hub" />
        <text className="wheel-hub-logo" y="1">🦅</text>
        <g ref={pointerRef} className="wheel-pointer">
          <path d="M-9 -113 L9 -113 L0 -88 Z" />
        </g>
      </svg>
    </div>
  )
}
