import { useState } from 'react'
import { api } from '../lib/api'
import { fullName, kaseWord, plural, todayISO } from '../lib/stats'
import { DonationList } from '../public/Donations'

const OTHER = 'other'
const ANON = 'anon'

// Add a kasa brought for "dobrodelni nameni": no fine, but it counts in the season's kase.
export default function Charity({ data, run }) {
  const [date, setDate] = useState(todayISO)
  const [donor, setDonor] = useState('')
  const [donorName, setDonorName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const players = data.players.filter((p) => p.active).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const valid = donor !== '' && (donor !== OTHER || donorName.trim() !== '') && quantity >= 1

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const row = {
      date,
      player_id: donor === OTHER || donor === ANON ? null : Number(donor),
      donor_name: donor === OTHER ? donorName.trim() : null,
      quantity: Number(quantity),
      note: note.trim() || null,
    }
    const q = Number(quantity)
    const ok = await run(() => api.addDonation(row), `${q} ${kaseWord(q)} ${plural(q, 'dodana', 'dodane')} 🍻`)
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
      onClick={() => confirm('Izbrišem to dobrodelno kaso?') && run(() => api.deleteDonation(d.id), 'Izbrisano')}>
      🗑
    </button>
  )

  return (
    <>
      <form className="section form" onSubmit={submit}>
        <h2 className="section-title"><span className="section-icon">🍻</span>Dobrodelni nameni</h2>
        <p className="hint">Kasa brez multe: ne šteje kot multa, šteje pa med kase sezone.</p>
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
          Kdo jo je prinesel
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
          {valid ? `Dodaj ${Number(quantity)} ${kaseWord(Number(quantity))}` : 'Izberi, kdo jo je prinesel'}
        </button>
      </form>

      <section className="section">
        <h2 className="section-title"><span className="section-icon">📜</span>Vse dobrodelne kase</h2>
        <DonationList data={data} donations={data.donations ?? []} renderActions={actions} />
      </section>
    </>
  )
}
