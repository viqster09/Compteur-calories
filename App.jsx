import { useState, useRef, useEffect, useCallback } from 'react'

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PROMPT = 'calories@supermarket:~$'
const HISTORY_KEY = 'ticket-historique-v1'

let idCounter = 0

const nextId = () => ++idCounter

// =========================================
// UTILITAIRES HISTORIQUE
// =========================================

function todayKey() {
  const d = new Date()
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function loadHistorique() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveHistorique(hist) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist))
  } catch {
    // stockage indisponible (mode privé, quota, etc.) : on ignore silencieusement
  }
}

function formatDateLong(key) {
  const d = new Date(`${key}T00:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

function formatDateShort(key) {
  const d = new Date(`${key}T00:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export default function App() {
  const [lines, setLines] = useState([
    {
      id: nextId(),
      type: 'boot',
      text: 'LE TICKET — calculateur de calories v1.0'
    },
    {
      id: nextId(),
      type: 'boot',
      text: 'source des données : Open Food Facts (openfoodfacts.org)'
    },
    {
      id: nextId(),
      type: 'boot',
      text: ''
    },
    {
      id: nextId(),
      type: 'system',
      text: "Tape le nom d'un aliment pour commencer. Commandes : 'total', 'fin', 'dashboard'."
    }
  ])

  const [stage, setStage] = useState('name')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])
  const [pendingProduct, setPendingProduct] = useState(null)
  const [panier, setPanier] = useState([])
  const [showFormula, setShowFormula] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [historique, setHistorique] = useState(() => loadHistorique())

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      block: 'end'
    })
  }, [lines, busy])

  useEffect(() => {
    inputRef.current?.focus()
  }, [stage, busy])

  // =========================================
  // RESTAURER LE PANIER DU JOUR AU CHARGEMENT
  // =========================================

  useEffect(() => {
    const jour = historique[todayKey()]

    if (jour && jour.items && jour.items.length > 0) {
      // on régénère des id propres pour éviter toute collision
      // avec le compteur de la session en cours
      setPanier(jour.items.map((item) => ({
        ...item,
        id: nextId()
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // =========================================
  // SYNCHRONISER LE PANIER -> HISTORIQUE DU JOUR
  // =========================================

  useEffect(() => {
    const key = todayKey()

    const total = panier.reduce(
      (acc, item) =>
        acc + (item.calories_100g * item.quantite) / 100,
      0
    )

    setHistorique((prev) => {
      const updated = {
        ...prev,
        [key]: {
          items: panier,
          total: Math.round(total)
        }
      }

      saveHistorique(updated)
      return updated
    })
  }, [panier])

  const pushLine = useCallback((type, text) => {
    setLines((prev) => [
      ...prev,
      {
        id: nextId(),
        type,
        text
      }
    ])
  }, [])

  const pushLines = useCallback((arr) => {
    setLines((prev) => [
      ...prev,
      ...arr.map((line) => ({
        id: nextId(),
        ...line
      }))
    ])
  }, [])

  // =========================================
  // OUVRIR LES POPUPS
  // =========================================

  function PageAccompagnement() {
    setShowFormula(true)
  }

  function ouvrirDashboard() {
    setShowDashboard(true)
  }

  // =========================================
  // RECHERCHE ALIMENT
  // =========================================

  async function chercherAliment(terme) {
    const params = new URLSearchParams({
      search_terms: terme,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '6'
    })

    for (let tentative = 0; tentative < 3; tentative++) {
      try {
        const res = await fetch(
          `${API_URL}?${params.toString()}`
        )

        if (!res.ok) {
          throw new Error(String(res.status))
        }

        const data = await res.json()

        return (data.products || [])
          .map((product) => ({
            nom: product.product_name,
            calories_100g: product.nutriments
              ? product.nutriments['energy-kcal_100g']
              : undefined
          }))
          .filter(
            (product) =>
              product.nom &&
              typeof product.calories_100g === 'number'
          )
      } catch (e) {
        if (tentative < 2) {
          pushLine(
            'meta',
            'service occupé, nouvelle tentative…'
          )

          await new Promise((resolve) =>
            setTimeout(resolve, 1200)
          )
        }
      }
    }

    return null
  }

  // =========================================
  // SUPPRIMER UN ALIMENT
  // =========================================

  function supprimerAliment(id) {
    const aliment = panier.find(
      (item) => item.id === id
    )

    if (!aliment) {
      return
    }

    setPanier((prev) =>
      prev.filter((item) => item.id !== id)
    )

    pushLine(
      'meta',
      `supprimé : ${aliment.nom}`
    )
  }

  // =========================================
  // VIDER LE CLI
  // =========================================

  function viderCLI() {
    if (lines.length === 0) {
      pushLine(
        'warn',
        'Le CLI est déjà vide.'
      )
      return
    }

    setLines([])

    pushLine(
      'meta',
      '✓ Le CLI a été vidé.'
    )
  }

  // =========================================
  // VIDER LE PANIER
  // =========================================

  function viderPanier() {
    if (panier.length === 0) {
      pushLine(
        'warn',
        'Le ticket est déjà vide.'
      )
      return
    }

    setPanier([])

    pushLine(
      'meta',
      '✓ tous les aliments ont été supprimés du ticket.'
    )
  }

  // =========================================
  // VIDER L'HISTORIQUE COMPLET
  // =========================================

  function viderHistorique() {
    const confirmation = window.confirm(
      "Supprimer tout l'historique des jours précédents ? Cette action est irréversible."
    )

    if (!confirmation) {
      return
    }

    const key = todayKey()
    const aujourdhui = historique[key]

    // on garde uniquement les données du jour en cours
    const updated = aujourdhui
      ? { [key]: aujourdhui }
      : {}

    setHistorique(updated)
    saveHistorique(updated)

    pushLine(
      'meta',
      "✓ historique des jours précédents supprimé."
    )
  }

  // =========================================
  // AFFICHER TOTAL
  // =========================================

  function afficherTotal() {
    if (panier.length === 0) {
      pushLine(
        'warn',
        'Le ticket est vide pour le moment.'
      )
      return
    }

    const total = panier.reduce(
      (acc, item) =>
        acc +
        (item.calories_100g * item.quantite) / 100,
      0
    )

    const rows = panier.map((item) => {
      const cal = Math.round(
        (item.calories_100g * item.quantite) / 100
      )

      return {
        type: 'ticket-row',
        id: item.id,
        text: `${item.nom} (${item.quantite}g)`,
        kcal: `${cal} kcal`
      }
    })

    pushLines([
      {
        type: 'divider',
        text: '─'.repeat(38)
      },
      ...rows,
      {
        type: 'divider',
        text: '─'.repeat(38)
      },
      {
        type: 'total',
        text: 'TOTAL',
        kcal: `${Math.round(total)} kcal`
      },
      {
        type: 'divider',
        text: '─'.repeat(38)
      }
    ])
  }

  // =========================================
  // GESTION DU FORMULAIRE
  // =========================================

  async function handleSubmit(e) {
    e.preventDefault()

    const value = input.trim()

    if (!value || busy) {
      return
    }

    pushLine('user', value)
    setInput('')

    // =========================================
    // NOM DE L'ALIMENT
    // =========================================

    if (stage === 'name') {
      const cmd = value.toLowerCase()

      if (cmd === 'total' || cmd === 'fin') {
        afficherTotal()
        return
      }

      if (
        cmd === 'vider' ||
        cmd === 'vider le panier' ||
        cmd === 'supprimer tout' ||
        cmd === 'supprimer tous'
      ) {
        viderPanier()
        return
      }

      if (
        cmd === 'dashboard' ||
        cmd === 'historique' ||
        cmd === 'stats'
      ) {
        ouvrirDashboard()
        return
      }

      setBusy(true)

      pushLine(
        'meta',
        `recherche de "${value}"…`
      )

      const found = await chercherAliment(value)

      setBusy(false)

      if (found === null) {
        pushLine(
          'warn',
          "Le service ne répond pas pour l'instant. Réessaie dans un instant avec le même nom."
        )
        return
      }

      if (found.length === 0) {
        pushLine(
          'warn',
          `Rien trouvé pour "${value}". Essaie un nom plus simple (ex : "tomate" plutôt que "tomate cerise bio").`
        )
        return
      }

      setResults(found)

      pushLines([
        ...found.map((result, index) => ({
          type: 'choice',
          text: `[${index + 1}] ${result.nom}`,
          kcal: `${Math.round(
            result.calories_100g
          )} kcal/100g`
        })),
        {
          type: 'system',
          text: `Tape un numéro (1-${found.length}), ou 0 pour annuler.`
        }
      ])

      setStage('choosing')
      return
    }

    // =========================================
    // CHOIX DU PRODUIT
    // =========================================

    if (stage === 'choosing') {
      const n = parseInt(value, 10)

      if (n === 0) {
        pushLine('meta', 'annulé.')
        setStage('name')
        return
      }

      if (
        !Number.isInteger(n) ||
        n < 1 ||
        n > results.length
      ) {
        pushLine(
          'warn',
          `Choix invalide. Tape un numéro entre 1 et ${results.length}, ou 0 pour annuler.`
        )
        return
      }

      const produit = results[n - 1]

      setPendingProduct(produit)

      pushLine(
        'system',
        `Quantité de "${produit.nom}" en grammes ?`
      )

      setStage('quantity')
      return
    }

    // =========================================
    // QUANTITE
    // =========================================

    if (stage === 'quantity') {
      const qte = parseFloat(
        value.replace(',', '.')
      )

      if (isNaN(qte) || qte <= 0) {
        pushLine(
          'warn',
          'Entre un nombre de grammes valide (ex : 100).'
        )
        return
      }

      const item = {
        ...pendingProduct,
        id: nextId(),
        quantite: qte
      }

      setPanier((prev) => [
        ...prev,
        item
      ])

      const cal = Math.round(
        (item.calories_100g * qte) / 100
      )

      pushLine(
        'success',
        `✓ ajouté : ${item.nom} — ${qte}g — ${cal} kcal`
      )

      pushLine(
        'system',
        "Aliment suivant (ou 'total' / 'fin')."
      )

      setPendingProduct(null)
      setStage('name')
    }
  }

  return (
    <div className="crt-wrap">

      <div
        className="terminal"
        onClick={() => inputRef.current?.focus()}
      >

        <div className="titlebar">

          <div className="dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>

          <div className="titletext">
            calories@supermarket — zsh
          </div>

        </div>

        <div className="screen">

          {lines.map((line) => (
            <TerminalLine
              key={line.id}
              line={line}
              onDelete={supprimerAliment}
            />
          ))}

          {busy && (
            <div className="line meta">
              …
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="input-row"
          >

            <span className="prompt">
              {PROMPT}
            </span>

            <input
              ref={inputRef}
              className="cmd-input"
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              disabled={busy}
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />

            <span
              className="cursor"
              aria-hidden="true"
            >
              ▌
            </span>

          </form>

          {panier.length > 0 && (
            <div className="cart-actions">

              <button
                type="button"
                className="clear-cart"
                onClick={viderPanier}
              >
                🗑️ Vider tout le ticket
              </button>

            </div>
          )}

          {lines.length > 0 && (
            <div className="cart-actions">

              <button
                type="button"
                className="clear-cart"
                onClick={viderCLI}
              >
                🗑️ Vider tout le CLI
              </button>

            </div>
          )}

          <div className="cart-actions">

            <button
              type="button"
              className="clear-cart1"
              onClick={ouvrirDashboard}
            >
              📊 Tableau de bord du jour
            </button>

          </div>

          <div className="cart-actions">

            <button
              type="button"
              className="clear-cart1"
              onClick={PageAccompagnement}
            >
              Voulez-vous perdre du poids ?
            </button>

          </div>

          <div ref={scrollRef} />

        </div>

        <div
          className="scanlines"
          aria-hidden="true"
        />

      </div>

      <p className="footnote">
        Données nutritionnelles : Open Food Facts
        (base collaborative et open source).
      </p>

      {/* =========================================
          POPUP FORMULE
      ========================================= */}

      {showFormula && (
        <div
          className="formula-overlay"
          onClick={() => setShowFormula(false)}
        >

          <div
            className="formula-popup"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              type="button"
              className="formula-close"
              onClick={() => setShowFormula(false)}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="formula-title">
              CALCUL DES CALORIES
            </div>

            <div className="formula-content">

              <p>
                Pour estimer tes besoins énergétiques,
                on commence par calculer ton
                <strong> métabolisme de base (MB)</strong>.
              </p>

              <div className="formula-box">
                <h3>👨 Homme</h3>
                <p>
                  MB = 10 × poids + 6,25 × taille
                  − 5 × âge + 5
                </p>
              </div>

              <div className="formula-box">
                <h3>👩 Femme</h3>
                <p>
                  MB = 10 × poids + 6,25 × taille
                  − 5 × âge − 161
                </p>
              </div>

              <div className="formula-box">
                <h3>🛋️ Sans sport</h3>
                <p>
                  Calories de maintien ≈ MB × 1,2
                </p>
              </div>

              <div className="formula-box">
                <h3>📉 Perte de poids</h3>
                <p>
                  Déficit modéré ≈ 10 à 20 %
                  sous les calories de maintien.
                </p>
              </div>

              <div className="formula-example">

                <h3>Exemple</h3>

                <p>
                  Si ton métabolisme de base est de
                  <strong> 1 800 kcal</strong> :
                </p>

                <p>
                  1 800 × 1,2 ≈
                  <strong> 2 160 kcal/jour</strong>
                </p>

                <p>
                  Cela correspond approximativement
                  aux calories de maintien avec une
                  activité très faible.
                </p>

              </div>

              <p className="formula-warning">
                ⚠️ Ces formules donnent une estimation.
                Les besoins réels peuvent varier selon
                l'activité quotidienne, la croissance,
                la composition corporelle et d'autres facteurs.
              </p>

            </div>

            <button
              type="button"
              className="formula-button"
              onClick={() => setShowFormula(false)}
            >
              Compris
            </button>

          </div>

        </div>
      )}

      {/* =========================================
          POPUP DASHBOARD
      ========================================= */}

      {showDashboard && (
        <div
          className="formula-overlay"
          onClick={() => setShowDashboard(false)}
        >

          <div
            className="formula-popup"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              type="button"
              className="formula-close"
              onClick={() => setShowDashboard(false)}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="formula-title">
              TABLEAU DE BORD
            </div>

            <div className="formula-content">

              <Dashboard
                historique={historique}
                onClearHistory={viderHistorique}
              />

            </div>

            <button
              type="button"
              className="formula-button"
              onClick={() => setShowDashboard(false)}
            >
              Fermer
            </button>

          </div>

        </div>
      )}

    </div>
  )
}

// =========================================
// DASHBOARD QUOTIDIEN + HISTORIQUE
// =========================================

function Dashboard({ historique, onClearHistory }) {
  const key = todayKey()
  const aujourdhui = historique[key] || {
    items: [],
    total: 0
  }

  const jours = Object.entries(historique)
    .filter(([k]) => k !== key)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 14)

  const totauxHistorique = jours.map(([, v]) => v.total)
  const maxTotal = Math.max(aujourdhui.total, ...totauxHistorique, 1)

  const moyenne = totauxHistorique.length > 0
    ? Math.round(
        totauxHistorique.reduce((a, b) => a + b, 0) /
          totauxHistorique.length
      )
    : null

  return (
    <>

      <div className="formula-box">
        <h3>📅 Aujourd'hui — {formatDateLong(key)}</h3>

        <p>
          <strong>{aujourdhui.total} kcal</strong> consommées
          {aujourdhui.items.length > 0
            ? ` sur ${aujourdhui.items.length} aliment${aujourdhui.items.length > 1 ? 's' : ''}`
            : ''}
        </p>

        {aujourdhui.items.length === 0 && (
          <p>Aucun aliment enregistré pour l'instant.</p>
        )}

        {aujourdhui.items.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
            {aujourdhui.items.map((item) => (
              <li key={item.id}>
                {item.nom} ({item.quantite}g) —{' '}
                {Math.round((item.calories_100g * item.quantite) / 100)} kcal
              </li>
            ))}
          </ul>
        )}
      </div>

      {moyenne !== null && (
        <div className="formula-box">
          <h3>📈 Moyenne des jours précédents</h3>
          <p><strong>{moyenne} kcal</strong> / jour en moyenne</p>
        </div>
      )}

      <div className="formula-example">
        <h3>Historique (14 derniers jours)</h3>

        {jours.length === 0 && (
          <p>Pas encore d'historique. Reviens demain !</p>
        )}

        {jours.map(([jourKey, data]) => (
          <div
            key={jourKey}
            style={{
              margin: '10px 0',
              fontSize: '0.9em'
            }}
          >

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span>{formatDateShort(jourKey)}</span>
              <span><strong>{data.total} kcal</strong></span>
            </div>

            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.max((data.total / maxTotal) * 100, 2)}%`,
                height: '100%',
                background: '#4ade80'
              }} />
            </div>

          </div>
        ))}
      </div>

      {jours.length > 0 && (
        <button
          type="button"
          className="formula-button"
          onClick={onClearHistory}
          style={{ marginTop: '12px' }}
        >
          🗑️ Vider l'historique précédent
        </button>
      )}

    </>
  )
}

// =========================================
// AFFICHAGE DES LIGNES
// =========================================

function TerminalLine({ line, onDelete }) {

  if (line.type === 'divider') {
    return (
      <div className="line divider">
        {line.text}
      </div>
    )
  }

  if (line.type === 'ticket-row') {
    return (
      <div className="line ticket-row">

        <span>
          {line.text}
        </span>

        <span className="kcal">
          {line.kcal}
        </span>

        <button
          type="button"
          className="delete-food"
          onClick={() =>
            onDelete(line.id)
          }
          title="Supprimer cet aliment"
          aria-label="Supprimer cet aliment"
        >
          ❌
        </button>

      </div>
    )
  }

  if (line.type === 'total') {
    return (
      <div className="line total">

        <span>
          {line.text}
        </span>

        <span className="kcal">
          {line.kcal}
        </span>

      </div>
    )
  }

  if (line.type === 'choice') {
    return (
      <div className="line choice">

        <span>
          {line.text}
        </span>

        <span className="kcal">
          {line.kcal}
        </span>

      </div>
    )
  }

  if (line.type === 'user') {
    return (
      <div className="line user">

        <span className="prompt">
          {PROMPT}
        </span>{' '}

        {line.text}

      </div>
    )
  }

  return (
    <div className={`line ${line.type}`}>
      {line.text}
    </div>
  )
}
