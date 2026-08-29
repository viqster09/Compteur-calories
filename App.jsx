```jsx
import { useRef, useState } from 'react'

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export default function App() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(100)

  const searchInputRef = useRef(null)

  async function searchFood(event) {
    event.preventDefault()

    const term = search.trim()

    if (!term || loading) {
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)
    setResults([])

    const params = new URLSearchParams({
      search_terms: term,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '12',
      fields:
        'code,product_name,nutriments,image_front_small_url,brands'
    })

    try {
      const response = await fetch(
        `${API_URL}?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()

      const products = (data.products || [])
        .map((product, index) => {
          const calories =
            product.nutriments &&
            product.nutriments['energy-kcal_100g']

          return {
            id:
              product.code ||
              `${product.product_name || 'food'}-${index}`,
            name: product.product_name || 'Aliment sans nom',
            calories:
              typeof calories === 'number'
                ? calories
                : null,
            image:
              product.image_front_small_url || '',
            brand: product.brands || ''
          }
        })
        .filter(
          (product) =>
            product.name &&
            typeof product.calories === 'number'
        )

      setResults(products)
    } catch (err) {
      console.error(err)

      setError(
        'Impossible de récupérer les aliments pour le moment.'
      )
    } finally {
      setLoading(false)
    }
  }

  function openAddModal(product) {
    setSelectedProduct(product)
    setQuantity(100)
  }

  function closeAddModal() {
    setSelectedProduct(null)
    setQuantity(100)
  }

  function addToCart() {
    if (!selectedProduct) {
      return
    }

    const grams = Number(quantity)

    if (!Number.isFinite(grams) || grams <= 0) {
      return
    }

    const existingItem = cart.find(
      (item) => item.id === selectedProduct.id
    )

    if (existingItem) {
      setCart((currentCart) =>
        currentCart.map((item) => {
          if (item.id !== selectedProduct.id) {
            return item
          }

          return {
            ...item,
            quantity: item.quantity + grams
          }
        })
      )
    } else {
      setCart((currentCart) => [
        ...currentCart,
        {
          ...selectedProduct,
          quantity: grams
        }
      ])
    }

    closeAddModal()
  }

  function removeFromCart(id) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    )
  }

  function updateQuantity(id, value) {
    const grams = Number(value)

    if (!Number.isFinite(grams) || grams <= 0) {
      return
    }

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== id) {
          return item
        }

        return {
          ...item,
          quantity: grams
        }
      })
    )
  }

  function increaseQuantity(id) {
    const item = cart.find(
      (currentItem) => currentItem.id === id
    )

    if (!item) {
      return
    }

    updateQuantity(id, item.quantity + 25)
  }

  function decreaseQuantity(id) {
    const item = cart.find(
      (currentItem) => currentItem.id === id
    )

    if (!item) {
      return
    }

    updateQuantity(
      id,
      Math.max(25, item.quantity - 25)
    )
  }

  function clearCart() {
    setCart([])
  }

  function useSuggestion(value) {
    setSearch(value)

    window.setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 50)
  }

  const totalCalories = cart.reduce(
    (total, item) => {
      return (
        total +
        (item.calories * item.quantity) / 100
      )
    },
    0
  )

  const totalGrams = cart.reduce(
    (total, item) => {
      return total + item.quantity
    },
    0
  )

  return (
    <div className="app">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            🔥
          </div>

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
              Recherche un aliment, choisis sa quantité
              et construis ton ticket nutritionnel.
            </p>
          </div>

          <div className="hero-flame">
            🔥
          </div>
        </section>

        <form
          className="search-box"
          onSubmit={searchFood}
        >
          <div className="search-icon">
            ⌕
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={search}
            placeholder="Rechercher un aliment..."
            onChange={(event) =>
              setSearch(event.target.value)
            }
            autoComplete="off"
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearch('')
                setResults([])
                setHasSearched(false)
                setError('')
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
                <span className="search-text">
                  Rechercher
                </span>

                <span className="arrow">
                  →
                </span>
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
                  {hasSearched
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

            {loading && (
              <div className="loading-state">
                <div className="loading-circle">
                  🔥
                </div>

                <h4>
                  Recherche en cours...
                </h4>

                <p>
                  Recherche dans Open Food Facts.
                </p>
              </div>
            )}

            {!loading &&
              results.length > 0 && (
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
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span>🍽️</span>
                        )}
                      </div>

                      <div className="product-info">
                        {product.brand && (
                          <span className="product-brand">
                            {product.brand}
                          </span>
                        )}

                        <h4>
                          {product.name}
                        </h4>

                        <div className="calories">
                          <strong>
                            {Math.round(
                              product.calories
                            )}
                          </strong>

                          <span>
                            kcal / 100g
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="add-button"
                        onClick={() =>
                          openAddModal(product)
                        }
                      >
                        <span>+</span>
                        Ajouter
                      </button>
                    </article>
                  ))}
                </div>
              )}

            {!loading &&
              hasSearched &&
              results.length === 0 && (
                <div className="empty-search">
                  <div>🥲</div>

                  <h4>
                    Aucun aliment trouvé
                  </h4>

                  <p>
                    Essaie un nom plus simple comme
                    « pomme », « riz » ou « poulet ».
                  </p>
                </div>
              )}

            {!loading &&
              !hasSearched && (
                <div className="welcome-card">
                  <div className="welcome-icon">
                    🔎
                  </div>

                  <h4>
                    Commence une recherche
                  </h4>

                  <p>
                    Trouve un aliment dans Open Food
                    Facts et ajoute-le à ton ticket.
                  </p>

                  <div className="suggestions">
                    <button
                      type="button"
                      onClick={() =>
                        useSuggestion('pomme')
                      }
                    >
                      🍎 Pomme
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        useSuggestion('banane')
                      }
                    >
                      🍌 Banane
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        useSuggestion('riz')
                      }
                    >
                      🍚 Riz
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        useSuggestion('poulet')
                      }
                    >
                      🍗 Poulet
                    </button>
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

              {cart.length > 0 && (
                <button
                  type="button"
                  className="clear-cart"
                  onClick={clearCart}
                >
                  Vider
                </button>
              )}
            </div>

            {cart.length === 0 && (
              <div className="ticket-empty">
                <div className="empty-cart-icon">
                  🛒
                </div>

                <h4>
                  Ton ticket est vide
                </h4>

                <p>
                  Ajoute des aliments pour commencer
                  ton calcul.
                </p>
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="ticket-items">
                  {cart.map((item) => {
                    const itemCalories =
                      (item.calories *
                        item.quantity) /
                      100

                    return (
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
                            <h4>
                              {item.name}
                            </h4>

                            <span>
                              {Math.round(
                                itemCalories
                              )}{' '}
                              kcal
                            </span>
                          </div>

                          <button
                            type="button"
                            className="delete-button"
                            aria-label="Supprimer"
                            onClick={() =>
                              removeFromCart(
                                item.id
                              )
                            }
                          >
                            ×
                          </button>
                        </div>

                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item.id,
                                event.target.value
                              )
                            }
                          />

                          <span>g</span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="ticket-summary">
                  <div className="summary-line">
                    <span>
                      Aliments
                    </span>

                    <strong>
                      {cart.length}
                    </strong>
                  </div>

                  <div className="summary-line">
                    <span>
                      Quantité totale
                    </span>

                    <strong>
                      {Math.round(totalGrams)} g
                    </strong>
                  </div>

                  <div className="total-line">
                    <div>
                      <span>
                        TOTAL
                      </span>

                      <small>
                        Calories estimées
                      </small>
                    </div>

                    <strong>
                      {Math.round(
                        totalCalories
                      )}
                      <small>
                        kcal
                      </small>
                    </strong>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      <footer>
        <span>
          🔥 CALORIES@SUPERMARKET
        </span>

        <span>
          Données fournies par Open Food Facts
        </span>
      </footer>

      {selectedProduct && (
        <div
          className="modal-overlay"
          onMouseDown={closeAddModal}
        >
          <div
            className="quantity-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeAddModal}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="modal-product-image">
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt=""
                />
              ) : (
                '🍽️'
              )}
            </div>

            <span className="section-label">
              AJOUTER AU TICKET
            </span>

            <h3>
              {selectedProduct.name}
            </h3>

            <p className="modal-calories">
              {Math.round(
                selectedProduct.calories
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
                onChange={(event) =>
                  setQuantity(
                    event.target.value
                  )
                }
                autoFocus
              />

              <span>
                grammes
              </span>
            </div>

            <div className="quick-quantities">
              {[50, 100, 150, 200, 250].map(
                (value) => (
                  <button
                    type="button"
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
                  (selectedProduct.calories *
                    (Number(quantity) || 0)) /
                    100
                )}{' '}
                kcal
              </strong>
            </div>

            <button
              type="button"
              className="modal-add"
              onClick={addToCart}
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
