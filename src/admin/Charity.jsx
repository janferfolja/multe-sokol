import { useState } from 'react'
import { api } from '../lib/api'
import { fullName, kaseWord, merendaWord, plural, todayISO } from '../lib/stats'
import { DonationList } from '../public/Donations'

const OTHER = 'other'
const ANON = 'anon'

// Add a kasa or merenda brought for "dobrodelni nameni": no fine, but it counts in the season's totals.
export default function Charity({ data, run }) {
  const [date, setDate] = useState(todayISO)
  const [kind, setKind] = useState('kasa')
  const [donor, setDonor] = useState('')
  const [donorName, setDonorName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const players = data.players.filter((p) => p.active).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const word = kind === 'kasa' ? kaseWord : merendaWord
  const valid = donor !== '' && (donor !== OTHER || donorName.trim() !== '') && quantity >= 1

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const row = {
      date,
      kind,
      player_id: donor === OTHER || donor === ANON ? null : Number(donor),
      donor_name: donor === OTHER ? donorName.trim() : null,
      quantity: Number(quantity),
      note: note.trim() || null,
    }
    const q = Number(quantity)
    const ok = await run(() => api.addDonation(row), `${q} ${word(q)} ${plural(q, 'dodana', 'dodane')} ${kind === 'kasa' ? '🍻' : '🍕'}`)
    setBusy(false)
    if (ok) {
      setDonor('')
      setDonorName('')
      setQuantity(1)
      setNote('')
    }
  }

  const actions = (d) => (
    <button className="btn btn-sm btn-ghost btn-danger" title="Izbriši"
      onClick={() => confirm('Izbrišem ta vnos?') && run(() => api.deleteDonation(d.id), 'Izbrisano')}>
      🗑
    </button>
  )

  return (
    <>
      <form className="section form" onSubmit={submit}>
        <h2 className="section-title"><span className="section-icon">🍻</span>Dobrodelni nameni</h2>
        <p className="hint">Kasa ali merenda brez multe: ne šteje kot multa, šteje pa v skupne kase in merende sezone.</p>
        <div className="seg" role="radiogroup" aria-label="Vrsta">
          <button type="button" role="radio" aria-checked={kind === 'kasa'} className={kind === 'kasa' ? 'on' : ''} onClick={() => setKind('kasa')}>🍻 Kasa</button>
          <button type="button" role="radio" aria-checked={kind === 'merenda'} className={kind === 'merenda' ? 'on' : ''} onClick={() => setKind('merenda')}>🍕 Merenda</button>
        </div>
        <div className="form-row">
          <label>
            Datum
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Količina
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>
        </div>
        <label>
          {kind === 'kasa' ? 'Kdo jo je prinesel' : 'Kdo jo je pripravil'}
          <select value={donor} onChange={(e) => setDonor(e.target.value)} required>
            <option value="">— izberi —</option>
            {players.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
            <option value={OTHER}>Nekdo drug…</option>
            <option value={ANON}>Anonimno</option>
          </select>
        </label>
        {donor === OTHER && (
          <label>
            Ime
            <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="npr. Sponzor, trener, starši…" required />
          </label>
        )}
        <label>
          Opomba (neobvezno)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. po zmagi v derbiju" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy || !valid}>
          {valid ? `Dodaj ${Number(quantity)} ${word(Number(quantity))}` : 'Izberi, kdo jo je prinesel'}
        </button>
      </form>

      <section className="section">
        <h2 className="section-title"><span className="section-icon">📜</span>Vse dobrodelne kase in merende</h2>
        <DonationList data={data} donations={data.donations ?? []} renderActions={actions} />
      </section>
    </>
  )
}
