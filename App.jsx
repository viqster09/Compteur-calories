import { useState, useRef, useEffect, useCallback } from 'react'

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PROMPT = 'calories@supermarket:~$'

// Stages du "script" : mêmes étapes que le CLI Python
//   name      -> on attend un nom d'aliment (ou 'total' / 'fin')
//   choosing  -> on attend un numéro de résultat
//   quantity  -> on attend une quantité en grammes

let idCounter = 0
const nextId = () => ++idCounter

export default function App() {
  const [lines, setLines] = useState([
    { id: nextId(), type: 'boot', text: 'LE TICKET — calculateur de calories v1.0' },
    { id: nextId(), type: 'boot', text: 'source des données : Open Food Facts (openfoodfacts.org)' },
    { id: nextId(), type: 'boot', text: '' },
    { id: nextId(), type: 'system', text: "Tape le nom d'un aliment pour commencer. Commandes : 'total', 'fin'." },
  ])
  const [stage, setStage] = useState('name')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])
  const [pendingProduct, setPendingProduct] = useState(null)
  const [panier, setPanier] = useState([])

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' })
  }, [lines, busy])

  useEffect(() => {
    inputRef.current?.focus()
  }, [stage, busy])

  const pushLine = useCallback((type, text) => {
    setLines(prev => [...prev, { id: nextId(), type, text }])
  }, [])

  const pushLines = useCallback((arr) => {
    setLines(prev => [...prev, ...arr.map(l => ({ id: nextId(), ...l }))])
  }, [])

  async function chercherAliment(terme) {
    const params = new URLSearchParams({
      search_terms: terme,
      search_simple: 1,
      action: 'process',
      json: 1,
      page_size: 6,
    })

    // 3 tentatives silencieuses, comme le script Python, mais sans étaler
    // la trace d'erreur : juste un message clair si tout échoue.
    for (let tentative = 0; tentative < 3; tentative++) {
      try {
        const res = await fetch(`${API_URL}?${params.toString()}`)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        return (data.products || [])
          .map(p => ({
            nom: p.product_name,
            calories_100g: p.nutriments ? p.nutriments['energy-kcal_100g'] : undefined,
          }))
          .filter(p => p.nom && typeof p.calories_100g === 'number')
      } catch (e) {
        if (tentative < 2) {
          pushLine('meta', '  service occupé, nouvelle tentative…')
          await new Promise(r => setTimeout(r, 1200))
        }
      }
    }
    return null // échec total après 3 tentatives
  }

  function afficherTotal() {
    if (panier.length === 0) {
      pushLine('warn', 'Le ticket est vide pour le moment.')
      return
    }
    const total = panier.reduce(
      (acc, it) => acc + (it.calories_100g * it.quantite) / 100, 0
    )
    const rows = panier.map(it => {
      const cal = Math.round((it.calories_100g * it.quantite) / 100)
      return { type: 'ticket-row', text: `${it.nom} (${it.quantite}g)`, kcal: `${cal} kcal` }
    })
    pushLines([
      { type: 'divider', text: '─'.repeat(38) },
      ...rows,
      { type: 'divider', text: '─'.repeat(38) },
      { type: 'total', text: 'TOTAL', kcal: `${Math.round(total)} kcal` },
      { type: 'divider', text: '─'.repeat(38) },
    ])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const value = input.trim()
    if (!value || busy) return

    pushLine('user', value)
    setInput('')

    if (stage === 'name') {
      const cmd = value.toLowerCase()
      if (cmd === 'total' || cmd === 'fin') {
        afficherTotal()
        return
      }

      setBusy(true)
      pushLine('meta', `recherche de "${value}"…`)
      const found = await chercherAliment(value)
      setBusy(false)

      if (found === null) {
        pushLine('warn', "Le service ne répond pas pour l'instant. Réessaie dans un instant avec le même nom.")
        return
      }
      if (found.length === 0) {
        pushLine('warn', `Rien trouvé pour "${value}". Essaie un nom plus simple (ex : "tomate" plutôt que "tomate cerise bio").`)
        return
      }

      setResults(found)
      pushLines([
        ...found.map((r, i) => ({
          type: 'choice',
          text: `  [${i + 1}] ${r.nom}`,
          kcal: `${Math.round(r.calories_100g)} kcal/100g`,
        })),
        { type: 'system', text: `Tape un numéro (1-${found.length}), ou 0 pour annuler.` },
      ])
      setStage('choosing')
      return
    }

    if (stage === 'choosing') {
      const n = parseInt(value, 10)
      if (n === 0) {
        pushLine('meta', 'annulé.')
        setStage('name')
        return
      }
      if (!Number.isInteger(n) || n < 1 || n > results.length) {
        pushLine('warn', `Choix invalide. Tape un numéro entre 1 et ${results.length}, ou 0 pour annuler.`)
        return
      }
      const produit = results[n - 1]
      setPendingProduct(produit)
      pushLine('system', `Quantité de "${produit.nom}" en grammes ?`)
      setStage('quantity')
      return
    }

    if (stage === 'quantity') {
      const qte = parseFloat(value.replace(',', '.'))
      if (isNaN(qte) || qte <= 0) {
        pushLine('warn', 'Entre un nombre de grammes valide (ex : 100).')
        return
      }
      const item = { ...pendingProduct, quantite: qte }
      setPanier(prev => [...prev, item])
      const cal = Math.round((item.calories_100g * qte) / 100)
      pushLine('success', `✓ ajouté : ${item.nom} — ${qte}g — ${cal} kcal`)
      pushLine('system', "Aliment suivant (ou 'total' / 'fin').")
      setPendingProduct(null)
      setStage('name')
      return
    }
  }

  return (
    <div className="crt-wrap">
      <div className="terminal" onClick={() => inputRef.current?.focus()}>
        <div className="titlebar">
          <div className="dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="titletext">calories@supermarket — zsh</div>
        </div>

        <div className="screen">
          {lines.map(line => (
            <TerminalLine key={line.id} line={line} />
          ))}

          {busy && <div className="line meta">…</div>}

          <form onSubmit={handleSubmit} className="input-row">
            <span className="prompt">{PROMPT}</span>
            <input
              ref={inputRef}
              className="cmd-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={busy}
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />
            <span className="cursor" aria-hidden="true">▌</span>
          </form>

          <div ref={scrollRef} />
        </div>

        <div className="scanlines" aria-hidden="true" />
      </div>

      <p className="footnote">
        Données nutritionnelles : Open Food Facts (base collaborative et open source).
      </p>
    </div>
  )
}

function TerminalLine({ line }) {
  if (line.type === 'divider') {
    return <div className="line divider">{line.text}</div>
  }
  if (line.type === 'ticket-row' || line.type === 'total') {
    return (
      <div className={`line ${line.type}`}>
        <span>{line.text}</span>
        <span className="kcal">{line.kcal}</span>
      </div>
    )
  }
  if (line.type === 'choice') {
    return (
      <div className="line choice">
        <span>{line.text}</span>
        <span className="kcal">{line.kcal}</span>
      </div>
    )
  }
  if (line.type === 'user') {
    return (
      <div className="line user">
        <span className="prompt">{PROMPT}</span> {line.text}
      </div>
    )
  }
  return <div className={`line ${line.type}`}>{line.text}</div>
}
