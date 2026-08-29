```jsx
import { useState, useRef, useEffect, useCallback } from 'react'

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PROMPT = 'calories@supermarket:~$'

let idCounter = 0

const nextId = () => ++idCounter

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
      text: "Tape le nom d'un aliment pour commencer. Commandes : 'total', 'fin'."
    }
  ])

  const [stage, setStage] = useState('name')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])
  const [pendingProduct, setPendingProduct] = useState(null)
  const [panier, setPanier] = useState([])

  // État de la popup
  const [showFormula, setShowFormula] = useState(false)

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
  // OUVRIR LA POPUP
  // =========================================

  const PageAccompagnement = () => {
    setShowFormula(true)
  }

  // =========================================
  // RECHERCHER UN ALIMENT
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
  // AFFICHER LE TOTAL
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
    // ÉTAPE : NOM DE L'ALIMENT
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
          text: ` [${index + 1}] ${result.nom}`,
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
    // ÉTAPE : CHOIX DU PRODUIT
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
    // ÉTAPE : QUANTITÉ
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

          {/* VIDER LE TICKET */}

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

          {/* VIDER LE CLI */}

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

          {/* BOUTON PERTE DE POIDS */}

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

    </div>
  )
}

// =========================================
// AFFICHAGE DES LIGNES DU TERMINAL
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
```

Et ajoute ce CSS **à la fin de ton `App.css`** pour que la popup soit correctement affichée :

```css
/* =========================================
   POPUP FORMULE CALORIES
========================================= */

.formula-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(5px);
}

.formula-popup {
  position: relative;

  width: min(650px, 100%);
  max-height: 90vh;

  overflow-y: auto;

  padding: 30px;

  background: #101016;

  border: 1px solid #8b5cf6;
  border-radius: 14px;

  box-shadow:
    0 0 25px rgba(139, 92, 246, 0.35),
    0 0 70px rgba(139, 92, 246, 0.15);

  color: #fff;
}

.formula-title {
  margin-bottom: 25px;

  text-align: center;

  font-size: 24px;
  font-weight: 700;

  color: #a78bfa;
}

.formula-content {
  line-height: 1.6;
}

.formula-content > p {
  margin-bottom: 20px;
}

.formula-box {
  margin: 15px 0;
  padding: 16px;

  background: rgba(139, 92, 246, 0.08);

  border: 1px solid rgba(167, 139, 250, 0.35);
  border-radius: 10px;
}

.formula-box h3 {
  margin: 0 0 8px;

  color: #c4b5fd;
}

.formula-box p {
  margin: 0;

  font-family: monospace;
  font-size: 15px;
}

.formula-example {
  margin-top: 20px;
  padding: 16px;

  background: rgba(34, 197, 94, 0.08);

  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 10px;
}

.formula-example h3 {
  margin-top: 0;
}

.formula-warning {
  margin-top: 20px;
  padding: 14px;

  background: rgba(255, 193, 7, 0.08);

  border: 1px solid rgba(255, 193, 7, 0.25);
  border-radius: 8px;

  font-size: 14px;
}

.formula-close {
  position: absolute;

  top: 8px;
  right: 14px;

  border: none;
  background: transparent;

  color: #fff;

  font-size: 32px;
  line-height: 1;

  cursor: pointer;
}

.formula-close:hover {
  color: #a78bfa;
}

.formula-button {
  width: 100%;

  margin-top: 20px;
  padding: 12px 18px;

  border: none;
  border-radius: 8px;

  background: #8b5cf6;

  color: white;

  font-weight: 600;

  cursor: pointer;
}

.formula-button:hover {
  opacity: 0.9;
}

@media (max-width: 600px) {

  .formula-overlay {
    padding: 12px;
  }

  .formula-popup {
    padding: 22px 18px;
    max-height: 92vh;
  }

  .formula-title {
    font-size: 20px;
    padding-right: 20px;
  }

  .formula-box {
    padding: 13px;
  }

  .formula-box p {
    font-size: 13px;
  }

}
```

Cette version **ne change pas de page** : le bouton ouvre directement la fenêtre avec les formules dans ton application Netlify.
