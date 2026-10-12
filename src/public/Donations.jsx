import { donationKasa, donorName, formatDate, kaseWord } from '../lib/stats'

// "Dobrodelni nameni": kase brought voluntarily. Used on the Multe page and in admin (with renderActions).
export function DonationList({ data, donations, onPlayer, renderActions }) {
  if (donations.length === 0) return <p className="empty">Še ni nobene dobrodelne kase.</p>
  return (
    <div className="fine-list">
      {donations.map((d) => (
        <div key={d.id} className="fine-row">
          <div className="fine-date">{formatDate(d.date)}</div>
          <div className="fine-main">
            {d.player_id != null && onPlayer ? (
              <button className="link" onClick={() => onPlayer(d.player_id)}>{donorName(d, data.players)}</button>
            ) : (
              <b>{donorName(d, data.players)}</b>
            )}
            <div className="fine-type">Dobrodelni nameni{d.note ? <span className="fine-note"> · {d.note}</span> : null}</div>
          </div>
          <div className="price-badge price-kasa">{`${d.quantity} ${kaseWord(d.quantity).toUpperCase()}`}</div>
          {renderActions?.(d)}
        </div>
      ))}
    </div>
  )
}

export default function Donations({ data, onPlayer }) {
  const donations = data.donations ?? []
  return (
    <section className="section">
      <h2 className="section-title">
        <span className="section-icon">🍻</span>Dobrodelni nameni
        {donations.length > 0 && <span className="count-chip">{donationKasa(donations)}</span>}
      </h2>
      <p className="hint">Kase, prinesene prostovoljno, brez multe. Štejejo med skupne kase sezone.</p>
      <DonationList data={data} donations={donations} onPlayer={onPlayer} />
    </section>
  )
}
