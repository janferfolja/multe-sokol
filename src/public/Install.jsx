import { useState } from 'react'
import { isStandalone, platform, useInstall } from '../lib/install'

// Shareable "download the app" page: #/app
export default function Install() {
  const { canPrompt, prompt } = useInstall()
  const [tab, setTab] = useState(() => (platform() === 'ios' ? 'ios' : 'android'))
  const [copied, setCopied] = useState(false)
  const url = window.location.origin + window.location.pathname

  if (isStandalone()) {
    return (
      <section className="section narrow install">
        <img src="icon-192.png" alt="" className="install-icon" />
        <h2 className="section-title">Aplikacija nameščena ✓</h2>
        <p>Že uporabljaš aplikacijo Multe Sokol.</p>
        <a className="btn btn-primary btn-lg" href="#/">Na lestvico</a>
      </section>
    )
  }

  return (
    <section className="section narrow install">
      <img src="icon-192.png" alt="" className="install-icon" />
      <h2 className="section-title">Prenesi aplikacijo</h2>
      <p className="muted">Brezplačno, brez trgovine: namestiš jo kar iz brskalnika in se prikaže med aplikacijami na telefonu.</p>

      {canPrompt && (
        <button className="btn btn-primary btn-lg" onClick={prompt}>📲 Namesti Multe Sokol</button>
      )}

      <div className="tabs install-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'android'} className={tab === 'android' ? 'active' : ''} onClick={() => setTab('android')}>Android</button>
        <button role="tab" aria-selected={tab === 'ios'} className={tab === 'ios' ? 'active' : ''} onClick={() => setTab('ios')}>iPhone</button>
      </div>

      {tab === 'android' ? (
        <ol className="install-steps">
          <li>Odpri to stran v <b>Chromu</b>.</li>
          <li>{canPrompt ? <>Tapni <b>Namesti Multe Sokol</b> zgoraj.</> : <>Tapni meni <b>⋮</b> zgoraj desno.</>}</li>
          {!canPrompt && <li>Izberi <b>Namesti aplikacijo</b> (ali <b>Dodaj na začetni zaslon</b>).</li>}
          <li>Potrdi: ikona 🦅 se prikaže med tvojimi aplikacijami.</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>Odpri to stran v <b>Safariju</b> (iz Instagrama/WhatsAppa ne gre: najprej „Odpri v Safariju”).</li>
          <li>Tapni gumb <b>Deli</b> <span className="ios-share" aria-hidden>⬆︎</span> spodaj.</li>
          <li>Podrsaj in izberi <b>Dodaj na začetni zaslon</b>.</li>
          <li>Tapni <b>Dodaj</b>: ikona 🦅 se prikaže na začetnem zaslonu.</li>
        </ol>
      )}

      <div className="install-link">
        <span className="muted">Povezava za deljenje</span>
        <code>{url}#/app</code>
        <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(`${url}#/app`).then(() => setCopied(true))}>
          {copied ? 'Kopirano ✓' : 'Kopiraj'}
        </button>
      </div>
    </section>
  )
}
