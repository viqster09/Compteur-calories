```jsx
import { useState, useRef } from 'react'

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export default function App() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [panier, setPanier] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(100)

  const inputRef = useRef(null)

  async function rechercherAliment(e) {
    e?.preventDefault()

    const terme = search.trim()

    if (!terme || loading) return

    setLoading(true)
    setError('')
    setSearched(true)
    setResults([])

    const params = new URLSearchParams({
      search_terms: terme,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '12',
      fields: 'product_name,nutriments,image_front_small_url,brands'
    })

    try {
      const response = await fetch(`${API_URL}?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erreur API')
      }

      const data = await response.json()

      const products = (data.products || [])
        .map((product) => ({
          id:
            product.code ||
            `${product.product_name}-${Math.random()}`,
          nom: product.product_name,
          calories_100g:
            product.nutriments?.['energy-kcal_100g'],
          image: product.image_front_small_url || '',
          marque: product.brands || ''
        }))
        .filter(
          (product) =>
            product.nom &&
            typeof product.calories_100g === 'number'
        )

      setResults(products)
    } catch (err) {
      console.error(err)
      setError(
        "Impossible de récupérer les aliments pour le moment. Réessaie dans quelques secondes."
      )
    } finally {
      setLoading(false)
    }
  }

  function ouvrirAjout(product) {
    setSelectedProduct(product)
    setQuantity(100)
  }

  function fermerAjout() {
    setSelectedProduct(null)
    setQuantity(100)
  }

  function ajouterAuPanier() {
    if (!selectedProduct) return

    const qte = Number(quantity)

    if (!qte || qte <= 0) return

    const calories =
      (selectedProduct.calories_100g * qte) / 100

    const existingIndex = panier.findIndex(
      (item) => item.id === selectedProduct.id
    )

    if (existingIndex !== -1) {
      setPanier((prev) =>
        prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantite: item.quantite + qte
              }
            : item
        )
      )
    } else {
      setPanier((prev) => [
        ...prev,
        {
          ...selectedProduct,
          quantite: qte,
          calories
        }
      ])
    }

    fermerAjout()
  }

  function supprimerAliment(id) {
    setPanier((prev) =>
      prev.filter((item) => item.id !== id)
    )
  }

  function modifierQuantite(id, nouvelleQuantite) {
    const qte = Math.max(
      1,
      Number(nouvelleQuantite) || 1
    )

    setPanier((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantite: qte,
              calories:
                (item.calories_100g * qte) / 100
            }
          : item
      )
    )
  }

  function incrementer(id) {
    const item = panier.find((element) => element.id === id)

    if (item) {
      modifierQuantite(id, item.quantite + 25)
    }
  }

  function decrementer(id) {
    const item = panier.find((element) => element.id === id)

    if (item) {
      modifierQuantite(
        id,
        Math.max(25, item.quantite - 25)
      )
    }
  }

  function viderPanier() {
    setPanier([])
  }

  const totalCalories = panier.reduce(
    (total, item) =>
      total +
      (item.calories_100g * item.quantite) / 100,
    0
  )

  const totalGrammes = panier.reduce(
    (total, item) => total + item.quantite,
    0
  )

  return (
    <div className="app">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <header className="header">
        <div className="brand">
          <div className="brand-icon">🔥</div>

          <div>
            <h1>Calories</h1>
            <span>@supermarket</span>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot" />
          Open Food Facts
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              CALCULATEUR NUTRITIONNEL
            </span>

            <h2>
              Calcule tes calories
              <br />
              <span>simplement.</span>
            </h2>

            <p>
              Recherche un aliment, ajoute sa quantité
              et construis ton ticket nutritionnel.
            </p>
          </div>

          <div className="hero-flame">🔥</div>
        </section>

        <form
          className="search-box"
          onSubmit={rechercherAliment}
        >
          <div className="search-icon">⌕</div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un aliment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearch('')
                setResults([])
                setSearched(false)
              }}
            >
              ×
            </button>
          )}

          <button
            type="submit"
            className="search-button"
            disabled={loading || !search.trim()}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                Rechercher
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <span>!</span>
            {error}
          </div>
        )}

        <div className="layout">
          <section className="products-section">
            <div className="section-header">
              <div>
                <span className="section-label">
                  ALIMENTS
                </span>

                <h3>
                  {searched
                    ? 'Résultats de recherche'
                    : 'Que veux-tu manger ?'}
                </h3>
              </div>

              {results.length > 0 && (
                <span className="result-count">
                  {results.length} résultats
                </span>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-circle">
                  🔥
                </div>

                <h4>Recherche en cours...</h4>

                <p>
                  Nous cherchons les meilleurs résultats.
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="products-grid">
                {results.map((product) => (
                  <article
                    className="product-card"
                    key={product.id}
                  >
                    <div className="product-image">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.nom}
                          loading="lazy"
                        />
                      ) : (
                        <span>🍽️</span>
                      )}
                    </div>

                    <div className="product-info">
                      {product.marque && (
                        <span className="product-brand">
                          {product.marque}
                        </span>
                      )}

                      <h4>{product.nom}</h4>

                      <div className="calories">
                        <strong>
                          {Math.round(
                            product.calories_100g
                          )}
                        </strong>

                        <span>kcal / 100g</span>
                      </div>
                    </div>

                    <button
                      className="add-button"
                      onClick={() =>
                        ouvrirAjout(product)
                      }
                    >
                      <span>+</span>
                      Ajouter
                    </button>
                  </article>
                ))}
              </div>
            ) : searched && !loading ? (
              <div className="empty-search">
                <div>🥲</div>

                <h4>Aucun aliment trouvé</h4>

                <p>
                  Essaie avec un nom plus simple, comme
                  « pomme », « riz » ou « poulet ».
                </p>
              </div>
            ) : (
              <div className="welcome-card">
                <div className="welcome-icon">
                  🔎
                </div>

                <h4>Commence une recherche</h4>

                <p>
                  Trouve un aliment dans la base Open Food
                  Facts et ajoute-le à ton ticket.
                </p>

                <div className="suggestions">
                  {[
                    '🍎 Pomme',
                    '🍌 Banane',
                    '🍚 Riz',
                    '🍗 Poulet'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        const value =
                          suggestion
                            .replace(/^[^ ]+ /, '')
                            .trim()

                        setSearch(value)

                        setTimeout(() => {
                          inputRef.current?.focus()
                        }, 50)
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="ticket">
            <div className="ticket-header">
              <div>
                <span className="section-label">
                  MON TICKET
                </span>

                <h3>
                  Mon alimentation
                </h3>
              </div>

              {panier.length > 0 && (
                <button
                  className="clear-cart"
                  onClick={viderPanier}
                >
                  Vider
                </button>
              )}
            </div>

            {panier.length === 0 ? (
              <div className="ticket-empty">
                <div className="empty-cart-icon">
                  🛒
                </div>

                <h4>Ton ticket est vide</h4>

                <p>
                  Ajoute des aliments pour commencer à
                  calculer ton total.
                </p>
              </div>
            ) : (
              <>
                <div className="ticket-items">
                  {panier.map((item) => (
                    <div
                      className="ticket-item"
                      key={item.id}
                    >
                      <div className="ticket-item-top">
                        <div className="ticket-product-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                            />
                          ) : (
                            '🍽️'
                          )}
                        </div>

                        <div className="ticket-product-info">
                          <h4>{item.nom}</h4>

                          <span>
                            {Math.round(
                              (item.calories_100g *
                                item.quantite) /
                                100
                            )}{' '}
                            kcal
                          </span>
                        </div>

                        <button
                          className="delete-button"
                          onClick={() =>
                            supprimerAliment(item.id)
                          }
                          aria-label={`Supprimer ${item.nom}`}
                        >
                          ×
                        </button>
                      </div>

                      <div className="quantity-control">
                        <button
                          onClick={() =>
                            decrementer(item.id)
                          }
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="1"
                          value={item.quantite}
                          onChange={(e) =>
                            modifierQuantite(
                              item.id,
                              e.target.value
                            )
                          }
                        />

                        <span>g</span>

                        <button
                          onClick={() =>
                            incrementer(item.id)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ticket-summary">
                  <div className="summary-line">
                    <span>Aliments</span>
                    <strong>
                      {panier.length}
                    </strong>
                  </div>

                  <div className="summary-line">
                    <span>Quantité totale</span>
                    <strong>
                      {Math.round(totalGrammes)} g
                    </strong>
                  </div>

                  <div className="total-line">
                    <div>
                      <span>TOTAL</span>
                      <small>Calories estimées</small>
                    </div>

                    <strong>
                      {Math.round(totalCalories)}
                      <small>kcal</small>
                    </strong>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      <footer>
        <span>🔥 CALORIES@SUPERMARKET</span>
        <span>
          Données fournies par Open Food Facts
        </span>
      </footer>

      {selectedProduct && (
        <div
          className="modal-overlay"
          onMouseDown={fermerAjout}
        >
          <div
            className="quantity-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={fermerAjout}
            >
              ×
            </button>

            <div className="modal-product-image">
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.nom}
                />
              ) : (
                '🍽️'
              )}
            </div>

            <span className="section-label">
              AJOUTER AU TICKET
            </span>

            <h3>{selectedProduct.nom}</h3>

            <p className="modal-calories">
              {Math.round(
                selectedProduct.calories_100g
              )}{' '}
              kcal / 100g
            </p>

            <label htmlFor="quantity">
              Quantité
            </label>

            <div className="quantity-input">
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                autoFocus
              />

              <span>grammes</span>
            </div>

            <div className="quick-quantities">
              {[50, 100, 150, 200, 250].map(
                (value) => (
                  <button
                    key={value}
                    className={
                      Number(quantity) === value
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setQuantity(value)
                    }
                  >
                    {value}g
                  </button>
                )
              )}
            </div>

            <div className="modal-preview">
              <span>
                Calories estimées
              </span>

              <strong>
                {Math.round(
                  (selectedProduct.calories_100g *
                    (Number(quantity) || 0)) /
                    100
                )}{' '}
                kcal
              </strong>
            </div>

            <button
              className="modal-add"
              onClick={ajouterAuPanier}
            >
              <span>+</span>
              Ajouter au ticket
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```
