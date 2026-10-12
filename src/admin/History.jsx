import { useState } from 'react'
import { api } from '../lib/api'
import { fullName, priceLabel } from '../lib/stats'
import { FineList, useFineFilters } from '../public/AllFines'

export default function History({ data, run }) {
  const { filtered, controls } = useFineFilters(data)
  const [limit, setLimit] = useState(50)
  const [editing, setEditing] = useState(null)

  const actions = (f) => (
    <div className="row-actions">
      <button className="btn btn-sm btn-ghost" title={f.paid ? 'Segna come non pagata' : 'Segna come pagata'}
        onClick={() => run(() => api.setPaid([f.id], !f.paid), f.paid ? 'Segnata come non pagata' : 'Segnata come pagata ✓')}>
        {f.paid ? '↩︎' : '✓'}
      </button>
      <button className="btn btn-sm btn-ghost" title="Modifica" onClick={() => setEditing(f)}>✎</button>
      <button className="btn btn-sm btn-ghost btn-danger" title="Elimina"
        onClick={() => confirm('Eliminare questa multa?') && run(() => api.deleteFines([f.id]), 'Multa eliminata')}>
        🗑
      </button>
    </div>
  )

  return (
    <section className="section">
      <h2 className="section-title"><span className="section-icon">📜</span>Storico<span className="count-chip">{filtered.length}</span></h2>
      {controls}
      <FineList data={data} fines={filtered.slice(0, limit)} renderActions={actions} />
      {filtered.length > limit && <button className="btn btn-ghost btn-block" onClick={() => setLimit(limit + 100)}>Mostra altre</button>}
      {editing && <EditFine data={data} fine={editing} run={run} onClose={() => setEditing(null)} />}
    </section>
  )
}

function EditFine({ data, fine, run, onClose }) {
  const [form, setForm] = useState({
    player_id: fine.player_id, fine_type_id: fine.fine_type_id, date: fine.date,
    note: fine.note ?? '', amount: fine.amount ?? '', paid: fine.paid,
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const type = data.fineTypes.find((t) => t.id === Number(form.fine_type_id))
  const typeChanged = Number(form.fine_type_id) !== fine.fine_type_id

  const save = async (e) => {
    e.preventDefault()
    const patch = {
      player_id: Number(form.player_id), fine_type_id: Number(form.fine_type_id), date: form.date,
      note: form.note.trim() || null, paid: form.paid,
    }
    // Amount follows the new type's price unless an euro amount was typed explicitly.
    if (type.kind !== 'euro') patch.amount = null
    else if (typeChanged) patch.amount = type.price
    else if (form.amount !== '') patch.amount = Number(form.amount)
    if (await run(() => api.updateFine(fine.id, patch), 'Multa aggiornata ✓')) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        <h2>Modifica multa #{fine.id}</h2>
        <label>Giocatore
          <select value={form.player_id} onChange={set('player_id')}>
            {[...data.players].sort((a, b) => fullName(a).localeCompare(fullName(b))).map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
          </select>
        </label>
        <label>Multa
          <select value={form.fine_type_id} onChange={set('fine_type_id')}>
            {data.fineTypes.map((t) => <option key={t.id} value={t.id}>{t.name} — {priceLabel(t.kind, t.price)}</option>)}
          </select>
        </label>
        <div className="form-row">
          <label>Data<input type="date" value={form.date} onChange={set('date')} required /></label>
          {type?.kind === 'euro' && !typeChanged && (
            <label>Importo €<input type="number" min="0" step="0.5" value={form.amount} onChange={set('amount')} /></label>
          )}
        </div>
        <label>Nota<input type="text" value={form.note} onChange={set('note')} /></label>
        <label className="check"><input type="checkbox" checked={form.paid} onChange={set('paid')} /> Pagata</label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary">Salva</button>
        </div>
      </form>
    </div>
  )
}
