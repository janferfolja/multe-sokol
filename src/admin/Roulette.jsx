import { useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import {
  EFFECTS, KINDS, applies, coinLabel, coinsByPlayer, effectLabel, formatPercent, kindOf, outcomeLabel, payCandidates,
  pickOutcome, realPercent, saveSpin, targetFine, totalChance, undoSpin, wheelOutcomes,
} from '../lib/roulette'
import { formatDate, fullName, initials, plural, priceLabel } from '../lib/stats'
import RouletteWheel from '../public/RouletteWheel'
import { SpinList } from '../public/Roulette'

const SOUND_KEY = 'multe-sokol-ruleta-sound'
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

// Ruleta: spend a player's coin on a spin, hand out coins, edit what the wheel can give.
export default function Roulette({ data, run }) {
  const [spinning, setSpinning] = useState(false)
  return (
    <>
      <Spinner data={data} run={run} spinning={spinning} setSpinning={setSpinning} />
      <section className="section">
        <h2 className="section-title"><span className="section-icon">🕒</span>Vrtenja<span className="count-chip">{(data.spins ?? []).length}</span></h2>
        <p className="hint">Razveljavi vrne kovanec in vse, kar je vrtenje spremenilo.</p>
        <SpinList
          data={data}
          spins={(data.spins ?? []).slice(0, 30)}
          renderActions={(s) => (
            <button className="btn btn-sm btn-ghost" disabled={spinning}
              onClick={() => confirm(`Razveljavim vrtenje »${outcomeLabel(s)}«? Kovanec se vrne.`) &&
                run(() => undoSpin(s, data), 'Vrtenje razveljavljeno, kovanec vrnjen 🪙')}>
              Razveljavi
            </button>
          )}
        />
      </section>
      <Coins data={data} run={run} locked={spinning} />
      <Outcomes data={data} run={run} locked={spinning} />
    </>
  )
}

function Spinner({ data, run, spinning, setSpinning }) {
  const coins = useMemo(() => coinsByPlayer(data), [data])
  const coinsOf = (id) => coins.get(id) ?? []
  const [playerId, setPlayerId] = useState(null)
  const [coinKey, setCoinKey] = useState(null)
  const [second, setSecond] = useState(null) // player wheel for pay_other: { items }
  const [result, setResult] = useState(null) // { outcome, player, note }
  const [frozen, setFrozen] = useState(null) // the wheel as it was spun, kept until the next choice
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
  })
  const wheelRef = useRef(null)
  const secondRef = useRef(null)

  // Players who can spin, plus whoever is selected (even after their last coin is spent).
  const holders = data.players
    .filter((p) => coinsOf(p.id).length > 0 || p.id === playerId)
    .sort((a, b) => coinsOf(b.id).length - coinsOf(a.id).length || fullName(a).localeCompare(fullName(b)))
  const player = data.players.find((p) => p.id === playerId)
  const own = player ? coinsOf(player.id) : []
  const coin = own.find((c) => c.key === coinKey) ?? own[0] ?? null

  // The wheel for this coin: outcomes that can't do anything for it are left off.
  const all = useMemo(() => wheelOutcomes(data.rouletteOutcomes), [data.rouletteOutcomes])
  const ctx = player && coin
    ? { target: targetFine(data, player.id, coin), candidates: payCandidates(data, player.id), fineTypes: data.fineTypes }
    : null
  const wheel = ctx ? all.filter((o) => applies(o, ctx)) : all
  const skipped = ctx ? all.filter((o) => !applies(o, ctx)) : []
  const shown = frozen ?? wheel
  const reset = () => { setResult(null); setSecond(null); setFrozen(null) }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off') } catch { /* ignore */ }
  }

  const choosePlayer = (id) => {
    setPlayerId(id === playerId ? null : id)
    setCoinKey(null)
    reset()
  }

  const spin = async () => {
    if (!player || !coin || spinning || wheel.length === 0) return
    const outcome = pickOutcome(wheel)
    let other = null
    let items = null
    if (outcome.effect === 'pay_other') {
      items = ctx.candidates.map(({ player: p }, i) => ({ id: p.id, name: p.alias || p.name, chance: 1, kind: i % 2 ? 'player-b' : 'player-a' }))
      const picked = pickOutcome(items)
      other = ctx.candidates.find((c) => c.player.id === picked.id)
    }
    setResult(null)
    setSecond(null)
    setFrozen(wheel)
    setSpinning(true)
    await nextFrame()
    // Save straight away (the coin is spent even if the page is closed mid-spin); reveal after.
    const saving = saveSpin(data, player.id, coin, outcome, other)
    saving.catch(() => {}) // reported by run() below
    await wheelRef.current?.spin(outcome)
    if (other) {
      setSecond({ items })
      await nextFrame()
      secondRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      await secondRef.current?.spin(items.find((x) => x.id === other.player.id))
    }
    let note = ''
    const ok = await run(async () => { note = await saving }, () => `🎰 ${fullName(player)}: ${outcomeLabel(outcome)}`)
    setSpinning(false)
    setCoinKey(null)
    if (ok) setResult({ outcome: { ...outcome, kind: kindOf(outcome) }, player, note })
  }

  return (
    <section className="section roulette-section">
      <h2 className="section-title">
        <span className="section-icon">🎰</span>Ruleta
        <button type="button" className="btn btn-sm btn-ghost push-right" onClick={toggleSound} aria-pressed={sound}
          title={sound ? 'Izklopi zvok' : 'Vklopi zvok'}>
          {sound ? '🔊' : '🔇'}
        </button>
      </h2>
      <p className="hint">Vsaka nova multa = 🪙 kovanec. Izberi igralca in zavrti zanj.</p>

      {holders.length === 0 ? (
        <p className="empty">Nihče nima kovanca. Kovanec dobi igralec za vsako novo multo, ali pa ga podeliš spodaj.</p>
      ) : (
        <div className="chips roulette-players">
          {holders.map((p) => (
            <button type="button" key={p.id} aria-pressed={p.id === playerId} disabled={spinning}
              className={`chip ${p.id === playerId ? 'on' : ''}`} onClick={() => choosePlayer(p.id)}>
              <span className="chip-avatar">{initials(p)}</span>
              {p.name} {p.surname}
              <span className="coin-count">🪙 {coinsOf(p.id).length}</span>
            </button>
          ))}
        </div>
      )}

      {player && own.length > 0 && (
        <label className="coin-pick">
          Kovanec
          <select value={coin?.key ?? ''} onChange={(e) => { setCoinKey(e.target.value); reset() }} disabled={spinning}>
            {own.map((c) => <option key={c.key} value={c.key}>{coinLabel(c, data)}</option>)}
          </select>
          {ctx && (
            <span className="coin-target">
              {ctx.target
                ? <>Velja za multo: <b>{data.fineTypes.find((t) => t.id === ctx.target.fine_type_id)?.name}</b> ({formatDate(ctx.target.date)})</>
                : 'Igralec nima odprte multe: izidi za »to multo« odpadejo.'}
            </span>
          )}
        </label>
      )}

      <RouletteWheel ref={wheelRef} outcomes={shown} sound={sound} />
      {!frozen && skipped.length > 0 && (
        <p className="hint center">Za ta kovanec ne pride v poštev: {skipped.map(outcomeLabel).join(', ')}.</p>
      )}

      {second && (
        <div className="second-wheel">
          <h3 className="modal-subtitle">💸 Komu plača multo?</h3>
          <RouletteWheel ref={secondRef} outcomes={second.items} sound={sound} />
        </div>
      )}

      {result && (
        <div className={`spin-result ${result.outcome.kind}`} role="status">
          <div className="spin-result-emoji">{result.outcome.emoji || '🎰'}</div>
          <div className="grow">
            <div className="spin-result-kind">
              {result.outcome.kind === 'bonus' ? 'Bonus' : result.outcome.kind === 'malus' ? 'Malus' : 'Nič'} za {result.player.alias || result.player.name}
            </div>
            <div className="spin-result-name">{result.outcome.name}</div>
            {result.note && <div className="spin-result-note">{result.note}</div>}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg spin-button" onClick={spin} disabled={!player || !coin || spinning || wheel.length === 0}>
        {spinning ? 'Vrti se…'
          : !player ? 'Izberi igralca'
            : !coin ? `${player.name} nima več kovancev`
              : `Zavrti za ${player.name} · 🪙 ${own.length}`}
      </button>
    </section>
  )
}

// Coins handed out by an admin, on top of the ones from multe.
function Coins({ data, run, locked }) {
  const [picked, setPicked] = useState(() => new Set())
  const [reason, setReason] = useState('')
  const [count, setCount] = useState('1')
  const players = data.players.filter((p) => p.active).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const spent = new Map((data.spins ?? []).filter((s) => s.coin_id != null).map((s) => [s.coin_id, s]))
  const list = [...(data.coins ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
  const n = Math.max(1, Math.min(20, Number(count) || 1))
  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const give = async (e) => {
    e.preventDefault()
    if (picked.size === 0) return
    const rows = [...picked].flatMap((player_id) => Array.from({ length: n }, () => ({ player_id, reason: reason.trim() || null })))
    const total = rows.length
    if (await run(() => api.addCoins(rows), `🪙 ${total} ${plural(total, 'kovanec podeljen', 'kovanci podeljeni')}`)) {
      setPicked(new Set())
      setReason('')
      setCount('1')
    }
  }

  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">🪙</span>Podeli kovance</h2>
      <p className="hint">Kovanci na roko, poleg tistih iz mult. Tak kovanec velja za igralčevo najstarejšo neplačano multo.</p>
      <form className="form" onSubmit={give}>
        <fieldset className="player-picker">
          <legend>Igralci <span className="count-chip">{picked.size}</span></legend>
          <div className="chips">
            {players.map((p) => (
              <button type="button" key={p.id} aria-pressed={picked.has(p.id)} className={`chip ${picked.has(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}>
                <span className="chip-avatar">{initials(p)}</span>{p.name} {p.surname}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="form-row">
          <label className="grow">Zakaj (neobvezno)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="npr. MVP tekme, rojstni dan…" /></label>
          <label>Koliko vsak<input type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} /></label>
        </div>
        <button className="btn btn-primary" disabled={picked.size === 0 || locked}>
          {picked.size === 0 ? 'Izberi igralce' : `Podeli ${picked.size * n} 🪙`}
        </button>
      </form>
      {list.length > 0 && (
        <>
          <h3 className="modal-subtitle">Podeljeni kovanci</h3>
          <div className="fine-list">
            {list.slice(0, 30).map((c) => {
              const p = data.players.find((x) => x.id === c.player_id)
              const used = spent.get(c.id)
              return (
                <div key={c.id} className="fine-row">
                  <div className="fine-date">{formatDate(c.created_at.slice(0, 10))}</div>
                  <div className="fine-main"><b>{fullName(p)}</b><div className="fine-type">🪙 {c.reason || 'brez razloga'}</div></div>
                  <div className={`status-badge ${used ? 'paid' : 'bonus-open'}`}>{used ? `Porabljen: ${outcomeLabel(used)}` : 'Na voljo'}</div>
                  {!used && (
                    <button className="btn btn-sm btn-ghost btn-danger" title="Izbriši" disabled={locked}
                      onClick={() => confirm('Izbrišem ta kovanec?') && run(() => api.deleteCoin(c.id), 'Kovanec izbrisan')}>🗑</button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

// What the wheel can give. Chances are edited in one go, so they can be balanced to 100 %.
function Outcomes({ data, run, locked }) {
  const outcomes = data.rouletteOutcomes ?? []
  const [editing, setEditing] = useState(null) // outcome id, 'new', or null
  const [draft, setDraft] = useState({}) // id → typed chance
  const chanceOf = (o) => draft[o.id] ?? String(Number(o.chance))
  const live = outcomes.map((o) => ({ ...o, chance: Number(chanceOf(o)) || 0 }))
  const wheel = wheelOutcomes(live)
  const total = totalChance(wheel)
  const changed = outcomes.filter((o) => draft[o.id] != null && Number(draft[o.id]) !== Number(o.chance))
  const invalid = changed.some((o) => draft[o.id] === '' || Number(draft[o.id]) < 0 || Number(draft[o.id]) > 100)
  const roundTotal = Math.round(total * 100) / 100

  // Scale the active chances so they add up to exactly 100 (one decimal).
  const balance = () => {
    if (total <= 0) return
    const scaled = wheel.map((o) => ({ id: o.id, v: Math.round((o.chance / total) * 1000) / 10 }))
    const diff = Math.round((100 - scaled.reduce((n, x) => n + x.v, 0)) * 10) / 10
    const biggest = scaled.reduce((a, b) => (b.v > a.v ? b : a))
    biggest.v = Math.round((biggest.v + diff) * 10) / 10
    setDraft((d) => ({ ...d, ...Object.fromEntries(scaled.map((x) => [x.id, String(x.v)])) }))
  }

  const saveChances = async () => {
    if (invalid || changed.length === 0) return
    const ok = await run(async () => {
      for (const o of changed) await api.saveOutcome({ id: o.id, chance: Number(draft[o.id]) })
    }, 'Verjetnosti shranjene ✓')
    if (ok) setDraft({})
  }

  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">⚙️</span>Izidi<span className="count-chip">{outcomes.length}</span>
        <button className="btn btn-sm btn-primary push-right" disabled={locked} onClick={() => setEditing('new')}>+ Nov</button>
      </h2>
      <p className="hint">
        Verjetnost je v %. Če vsota ni 100 %, se izidi sorazmerno preračunajo (prava verjetnost je v oklepaju).
        Izidi, ki za neko multo ne pridejo v poštev (npr. pol cene za KASO), se pri tistem vrtenju izpustijo.
      </p>
      {editing === 'new' && (
        <OutcomeForm data={data} run={run} initial={{ name: '', emoji: '', effect: 'waive_this', chance: '10', fine_type_id: '', active: true }} onDone={() => setEditing(null)} />
      )}
      {KINDS.map(([kind, title]) => (
        <div key={kind} className="manage-group">
          <h4>{title}</h4>
          <div className="manage-list">
            {outcomes.filter((o) => kindOf(o) === kind).map((o) => {
              if (editing === o.id) {
                return <OutcomeForm key={o.id} data={data} run={run} initial={{ ...o, emoji: o.emoji ?? '', chance: String(Number(o.chance)), fine_type_id: o.fine_type_id ?? '' }} onDone={() => setEditing(null)} />
              }
              const lo = live.find((x) => x.id === o.id)
              const real = realPercent(lo, wheel)
              const showReal = o.active && Math.abs(real - lo.chance) > 0.05
              return (
                <div key={o.id} className={`manage-row ${o.active ? '' : 'inactive'}`}>
                  <span className={`odds-dot ${kind}`} aria-hidden />
                  <div className="grow">
                    <b>{outcomeLabel(o)}</b>{!o.active && <span className="tag">neaktiven</span>}
                    <div className="muted small">{effectLabel(o, data.fineTypes)}</div>
                  </div>
                  <label className="chance-input">
                    <input type="number" inputMode="decimal" min="0" max="100" step="0.5" value={chanceOf(o)} disabled={locked}
                      aria-label={`Verjetnost: ${o.name}`}
                      onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))} />
                    <span>%</span>
                    {showReal && <span className="muted small chance-real">({formatPercent(real)})</span>}
                  </label>
                  <button className="btn btn-sm btn-ghost" disabled={locked} onClick={() => setEditing(o.id)}>Uredi</button>
                </div>
              )
            })}
            {!outcomes.some((o) => kindOf(o) === kind) && <p className="empty">Ni izidov.</p>}
          </div>
        </div>
      ))}
      <div className={`chance-total ${Math.abs(roundTotal - 100) < 0.01 ? 'ok' : 'warn'}`}>
        <span>Skupaj aktivni: <b>{formatPercent(roundTotal)}</b></span>
        <div className="form-actions">
          {Math.abs(roundTotal - 100) >= 0.01 && total > 0 && (
            <button type="button" className="btn btn-sm" disabled={locked} onClick={balance}>Prilagodi na 100 %</button>
          )}
          {changed.length > 0 && (
            <>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDraft({})}>Prekliči</button>
              <button type="button" className="btn btn-sm btn-primary" disabled={invalid || locked} onClick={saveChances}>Shrani verjetnosti</button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function OutcomeForm({ data, run, initial, onDone }) {
  const [form, setForm] = useState(initial)
  const isEdit = initial.id != null
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const types = data.fineTypes.filter((t) => t.active || t.id === Number(initial.fine_type_id))
  const valid = form.name.trim() !== '' && form.chance !== '' && Number(form.chance) >= 0 && Number(form.chance) <= 100 &&
    (form.effect !== 'extra_fine' || form.fine_type_id !== '')
  const used = isEdit && (data.spins ?? []).some((s) => s.outcome_id === initial.id)

  const save = async (e) => {
    e.preventDefault()
    if (!valid) return
    const o = {
      ...(isEdit ? { id: initial.id } : {}),
      name: form.name.trim(), emoji: form.emoji.trim() || null, effect: form.effect, chance: Number(form.chance),
      fine_type_id: form.effect === 'extra_fine' ? Number(form.fine_type_id) : null, active: form.active,
    }
    if (await run(() => api.saveOutcome(o), isEdit ? 'Izid posodobljen ✓' : 'Izid dodan ✓')) onDone()
  }

  const remove = async () => {
    const msg = used ? `Izbrišem »${form.name}«? Pretekla vrtenja ostanejo zapisana.` : `Izbrišem »${form.name}«?`
    if (confirm(msg) && (await run(() => api.deleteOutcome(initial.id), 'Izid izbrisan'))) onDone()
  }

  return (
    <form className="inline-form form" onSubmit={save}>
      <div className="form-row">
        <label className="emoji-input">Emoji<input value={form.emoji} onChange={set('emoji')} placeholder="😇" /></label>
        <label className="grow">Ime na ruleti<input value={form.name} onChange={set('name')} required autoFocus placeholder="npr. Multa oproščena" /></label>
      </div>
      <div className="form-row">
        <label className="grow">Kaj naredi
          <select value={form.effect} onChange={set('effect')}>
            {KINDS.map(([kind, title]) => (
              <optgroup key={kind} label={title}>
                {Object.entries(EFFECTS).filter(([, e]) => e.kind === kind).map(([k, e]) => <option key={k} value={k}>{e.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label>Verjetnost %
          <input type="number" inputMode="decimal" min="0" max="100" step="0.5" value={form.chance} onChange={set('chance')} required />
        </label>
      </div>
      {form.effect === 'extra_fine' && (
        <label>Katera multa
          <select value={form.fine_type_id} onChange={set('fine_type_id')} required>
            <option value="">— izberi —</option>
            {['euro', 'kasa', 'merenda'].map((kind) => (
              <optgroup key={kind} label={kind === 'euro' ? 'Euro' : kind.toUpperCase()}>
                {types.filter((t) => t.kind === kind).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {priceLabel(t.kind, t.price)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      <p className="hint">
        {{
          waive_this: 'Multa, za katero je kovanec, se ne šteje več (ostane v zgodovini).',
          half_this: 'Euro multa, za katero je kovanec, stane pol. Pri KASAH in MERENDAH se izid izpusti.',
          jolly: 'Igralec dobi jolly, ki samodejno prekliče njegovo naslednjo multo.',
          none: 'Multa ostane, kot je.',
          double_this: 'Multa, za katero je kovanec, šteje dvojno (3€ → 6€, KASA → 2 KASE).',
          extra_fine: 'Igralec dobi še eno multo (z današnjim datumom). Za to multo ni kovanca.',
          pay_other: 'Druga ruleta izbere igralca z neplačano multo. Njegova najstarejša multa se mu oprosti, plača jo tisti, ki je vrtel.',
        }[form.effect]}
      </p>
      <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Aktiven (na ruleti)</label>
      <div className="form-actions">
        {isEdit && <button type="button" className="btn btn-ghost btn-danger push-right-auto" onClick={remove}>🗑 Izbriši</button>}
        <button type="button" className="btn btn-ghost" onClick={onDone}>Prekliči</button>
        <button className="btn btn-primary" disabled={!valid}>Shrani</button>
      </div>
    </form>
  )
}
