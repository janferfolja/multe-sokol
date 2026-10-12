import { useState } from 'react'
import { api } from '../lib/api'
import { priceLabel } from '../lib/stats'

const EMPTY = { name: '', kind: 'euro', price: '', active: true }
const KINDS = [['euro', 'Euro'], ['kasa', 'KASA'], ['merenda', 'MERENDA']]

export default function FineTypes({ data, run }) {
  const [editing, setEditing] = useState(null) // type id, 'new', or null
  const counts = new Map()
  for (const f of data.fines) counts.set(f.fine_type_id, (counts.get(f.fine_type_id) ?? 0) + 1)

  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">📋</span>Tipi di multa<span className="count-chip">{data.fineTypes.length}</span>
        <button className="btn btn-sm btn-primary push-right" onClick={() => setEditing('new')}>+ Nuovo</button>
      </h2>
      <p className="hint">Cambiare un prezzo vale solo per le multe nuove: quelle già date restano al prezzo di allora.</p>
      {editing === 'new' && <TypeForm initial={EMPTY} run={run} onDone={() => setEditing(null)} />}
      {KINDS.map(([kind, title]) => (
        <div key={kind} className="manage-group">
          <h4>{title}</h4>
          <div className="manage-list">
            {data.fineTypes.filter((t) => t.kind === kind).map((t) =>
              editing === t.id ? (
                <TypeForm key={t.id} initial={{ ...t, price: t.price ?? '' }} run={run} onDone={() => setEditing(null)} />
              ) : (
                <div key={t.id} className={`manage-row ${t.active ? '' : 'inactive'}`}>
                  <div className="grow">{t.name}{!t.active && <span className="tag">non attivo</span>}</div>
                  <span className="muted">{counts.get(t.id) ?? 0}×</span>
                  <span className={`legend-price legend-${kind}`}>{priceLabel(kind, t.price)}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(t.id)}>Modifica</button>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

function TypeForm({ initial, run, onDone }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const t = {
      ...(form.id != null ? { id: form.id } : {}),
      name: form.name.trim(), kind: form.kind,
      price: form.kind === 'euro' ? Number(form.price) : null, active: form.active,
    }
    if (await run(() => api.saveFineType(t), form.id != null ? 'Tipo aggiornato ✓' : 'Tipo aggiunto ✓')) onDone()
  }

  return (
    <form className="inline-form form" onSubmit={save}>
      <label>Nome<input value={form.name} onChange={set('name')} required autoFocus /></label>
      <div className="form-row">
        <label>Tipo
          <select value={form.kind} onChange={set('kind')}>
            {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        {form.kind === 'euro' && (
          <label>Prezzo €<input type="number" min="0" step="0.5" value={form.price} onChange={set('price')} required /></label>
        )}
      </div>
      <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Attivo (visibile in legenda e tra le multe)</label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Annulla</button>
        <button className="btn btn-primary">Salva</button>
      </div>
    </form>
  )
}
