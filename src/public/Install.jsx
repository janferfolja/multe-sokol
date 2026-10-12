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
        <h2 className="section-title">App installata ✓</h2>
        <p>Stai già usando l'app Multe Sokol.</p>
        <a className="btn btn-primary btn-lg" href="#/">Vai alla lestvica</a>
      </section>
    )
  }

  return (
    <section className="section narrow install">
      <img src="icon-192.png" alt="" className="install-icon" />
      <h2 className="section-title">Scarica l'app</h2>
      <p className="muted">Gratis, niente store: si installa direttamente dal browser e appare tra le app del telefono.</p>

      {canPrompt && (
        <button className="btn btn-primary btn-lg" onClick={prompt}>📲 Installa Multe Sokol</button>
      )}

      <div className="tabs install-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'android'} className={tab === 'android' ? 'active' : ''} onClick={() => setTab('android')}>Android</button>
        <button role="tab" aria-selected={tab === 'ios'} className={tab === 'ios' ? 'active' : ''} onClick={() => setTab('ios')}>iPhone</button>
      </div>

      {tab === 'android' ? (
        <ol className="install-steps">
          <li>Apri questa pagina con <b>Chrome</b>.</li>
          <li>{canPrompt ? <>Tocca <b>Installa Multe Sokol</b> qui sopra.</> : <>Tocca il menu <b>⋮</b> in alto a destra.</>}</li>
          {!canPrompt && <li>Scegli <b>Installa app</b> (o <b>Aggiungi a schermata Home</b>).</li>}
          <li>Conferma: l'icona 🦅 compare tra le tue app.</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>Apri questa pagina con <b>Safari</b> (non funziona da Instagram/WhatsApp: prima “Apri in Safari”).</li>
          <li>Tocca il tasto <b>Condividi</b> <span className="ios-share" aria-hidden>⬆︎</span> in basso.</li>
          <li>Scorri e scegli <b>Aggiungi alla schermata Home</b>.</li>
          <li>Tocca <b>Aggiungi</b>: l'icona 🦅 compare nella Home.</li>
        </ol>
      )}

      <div className="install-link">
        <span className="muted">Link da condividere</span>
        <code>{url}#/app</code>
        <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(`${url}#/app`).then(() => setCopied(true))}>
          {copied ? 'Copiato ✓' : 'Copia'}
        </button>
      </div>
    </section>
  )
}
