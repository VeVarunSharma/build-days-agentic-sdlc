import { useEffect, useId, useState, type FormEvent } from "react";
import {
  fieldLimits,
  productCategories,
  type CartLine,
  type Product,
  type ProductCategory,
} from "../shared/contracts.js";
import { getProduct, listProducts } from "./api.js";
import {
  addToCart,
  cartItemCount,
  cartSubtotalCents,
  removeFromCart,
  setCartQuantity,
} from "./cart.js";

const formatMoney = (cents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

const titleCase = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

interface CheckoutFields {
  name: string;
  email: string;
  address: string;
}

const emptyCheckout: CheckoutFields = { name: "", email: "", address: "" };

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Product>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartNotice, setCartNotice] = useState("");
  const [checkout, setCheckout] = useState(emptyCheckout);
  const [checkoutErrors, setCheckoutErrors] = useState<
    Partial<Record<keyof CheckoutFields, string>>
  >({});
  const [confirmation, setConfirmation] = useState("");
  const catalogueStatusId = useId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(undefined);
    void listProducts({
      q: query || undefined,
      category: category || undefined,
    })
      .then((response) => {
        if (active) setProducts(response.items);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageFor(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, category, reload]);

  async function showDetails(product: Product) {
    setSelected(undefined);
    setDetailError(undefined);
    setDetailLoading(true);
    try {
      setSelected(await getProduct(product.id));
    } catch (error) {
      setDetailError(messageFor(error));
    } finally {
      setDetailLoading(false);
    }
  }

  function add(product: Product) {
    setCart((current) => {
      const line = current.find((item) => item.product.id === product.id);
      if (line?.quantity === fieldLimits.quantity) {
        setCartNotice(
          `${product.name} is already at the maximum quantity of ${fieldLimits.quantity}.`,
        );
        return current;
      }
      setCartNotice(`${product.name} added to your cart.`);
      return addToCart(current, product);
    });
    setConfirmation("");
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Partial<Record<keyof CheckoutFields, string>> = {};
    if (!checkout.name.trim()) errors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!checkout.address.trim()) errors.address = "Enter a delivery address.";
    setCheckoutErrors(errors);
    if (Object.keys(errors).length > 0 || cart.length === 0) return;
    setConfirmation(
      `Thanks, ${checkout.name.trim()}! Your simulated Babazon order is confirmed.`,
    );
    setCart([]);
    setCheckout(emptyCheckout);
    setCartNotice("");
  }

  const itemCount = cartItemCount(cart);
  const subtotal = cartSubtotalCents(cart);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#catalogue" aria-label="Babazon home">
          <span aria-hidden="true">B</span>Babazon
        </a>
        <p>Curious finds for everyday adventures.</p>
        <a className="cart-link" href="#cart">
          Cart <strong>{itemCount}</strong>
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">The bright-side marketplace</p>
          <h1 id="hero-title">Find something unexpectedly useful.</h1>
          <p>
            Explore a hand-picked collection for home, work, cooking, and the
            outdoors.
          </p>
        </div>
      </section>

      <main>
        <section id="catalogue" className="catalogue" aria-labelledby="catalogue-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Browse the collection</p>
              <h2 id="catalogue-title">Babazon goods</h2>
            </div>
            <span aria-live="polite">
              {!loading && !loadError
                ? `${products.length} ${products.length === 1 ? "product" : "products"}`
                : ""}
            </span>
          </div>

          <form
            className="filters"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(searchInput.trim());
            }}
          >
            <label>
              Search products
              <span className="search-row">
                <input
                  type="search"
                  value={searchInput}
                  maxLength={fieldLimits.search}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Try “lamp” or “picnic”"
                />
                <button type="submit">Search</button>
              </span>
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProductCategory | "")
                }
              >
                <option value="">All categories</option>
                {productCategories.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </select>
            </label>
          </form>

          <div id={catalogueStatusId} aria-live="polite">
            {loading ? (
              <p className="state" role="status">Loading products…</p>
            ) : loadError ? (
              <div className="state error-state" role="alert">
                <h3>We could not open the catalogue</h3>
                <p>{loadError}</p>
                <button type="button" onClick={() => setReload((value) => value + 1)}>
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="state">
                <h3>No products found</h3>
                <p>Try a different search or browse every category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setQuery("");
                    setCategory("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <ProductList products={products} onDetails={showDetails} onAdd={add} />
            )}
          </div>
        </section>

        <Cart
          cart={cart}
          notice={cartNotice}
          subtotal={subtotal}
          checkout={checkout}
          checkoutErrors={checkoutErrors}
          confirmation={confirmation}
          onCheckoutChange={setCheckout}
          onCheckout={submitCheckout}
          onQuantity={(productId, value) => {
            const quantity = Number(value);
            setCart((current) => setCartQuantity(current, productId, quantity));
            setConfirmation("");
          }}
          onRemove={(product) => {
            setCart((current) => removeFromCart(current, product.id));
            setCartNotice(`${product.name} removed from your cart.`);
          }}
        />
      </main>

      {(detailLoading || detailError || selected) && (
        <ProductDetails
          product={selected}
          loading={detailLoading}
          error={detailError}
          onAdd={add}
          onClose={() => {
            setSelected(undefined);
            setDetailError(undefined);
            setDetailLoading(false);
          }}
        />
      )}
    </>
  );
}

interface ProductListProps {
  products: Product[];
  onDetails: (product: Product) => Promise<void>;
  onAdd: (product: Product) => void;
}

function ProductList({ products, onDetails, onAdd }: ProductListProps) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li className="product-card" key={product.id}>
          <div
            className="product-art"
            style={{ "--accent": product.accent } as React.CSSProperties}
            aria-hidden="true"
          >
            <span>{product.name.charAt(0)}</span>
          </div>
          <div className="product-card-body">
            <div className="product-meta">
              <span>{product.category}</span>
              {product.badge && <strong>{product.badge}</strong>}
            </div>
            <h3>{product.name}</h3>
            <p>{product.shortDescription}</p>
            <p
              className="rating"
              aria-label={`${product.rating} out of 5 stars, ${product.reviewCount} reviews`}
            >
              <span aria-hidden="true">★</span> {product.rating} ({product.reviewCount})
            </p>
            <p className="price">{formatMoney(product.priceCents)}</p>
            <div className="card-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => void onDetails(product)}
              >
                View details
              </button>
              <button type="button" onClick={() => onAdd(product)}>Add to cart</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface CartProps {
  cart: CartLine[];
  notice: string;
  subtotal: number;
  checkout: CheckoutFields;
  checkoutErrors: Partial<Record<keyof CheckoutFields, string>>;
  confirmation: string;
  onCheckoutChange: (fields: CheckoutFields) => void;
  onCheckout: (event: FormEvent<HTMLFormElement>) => void;
  onQuantity: (productId: string, value: string) => void;
  onRemove: (product: Product) => void;
}

function Cart({
  cart,
  notice,
  subtotal,
  checkout,
  checkoutErrors,
  confirmation,
  onCheckoutChange,
  onCheckout,
  onQuantity,
  onRemove,
}: CartProps) {
  const count = cartItemCount(cart);
  return (
    <aside id="cart" className="cart-panel" aria-labelledby="cart-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your basket</p>
          <h2 id="cart-title">Cart</h2>
        </div>
        <span>{count} {count === 1 ? "item" : "items"}</span>
      </div>
      <div className="notice" aria-live="polite">{notice}</div>
      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <a href="#catalogue">Explore the collection</a>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {cart.map((line) => (
              <li key={line.product.id}>
                <div>
                  <strong>{line.product.name}</strong>
                  <span>{formatMoney(line.product.priceCents)} each</span>
                </div>
                <QuantityInput line={line} onQuantity={onQuantity} />
                <strong>
                  {formatMoney(line.product.priceCents * line.quantity)}
                </strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onRemove(line.product)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="subtotal">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </p>
          <form className="checkout" onSubmit={onCheckout} noValidate>
            <h3>Simulated checkout</h3>
            <p>No payment is collected. This is a demo order.</p>
            <CheckoutField
              label="Full name"
              name="name"
              value={checkout.name}
              error={checkoutErrors.name}
              onChange={(name) => onCheckoutChange({ ...checkout, name })}
            />
            <CheckoutField
              label="Email"
              name="email"
              value={checkout.email}
              type="email"
              error={checkoutErrors.email}
              onChange={(email) => onCheckoutChange({ ...checkout, email })}
            />
            <CheckoutField
              label="Delivery address"
              name="address"
              value={checkout.address}
              error={checkoutErrors.address}
              onChange={(address) => onCheckoutChange({ ...checkout, address })}
            />
            <button type="submit">Place simulated order</button>
          </form>
        </>
      )}
      {confirmation && (
        <div className="confirmation" role="status">
          <h3>Order confirmed</h3>
          <p>{confirmation}</p>
        </div>
      )}
    </aside>
  );
}

function QuantityInput({
  line,
  onQuantity,
}: {
  line: CartLine;
  onQuantity: (productId: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(String(line.quantity));
  const quantity = Number(draft);
  const valid =
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= fieldLimits.quantity;
  const errorId = `quantity-${line.product.id}-error`;

  useEffect(() => {
    setDraft(String(line.quantity));
  }, [line.quantity]);

  return (
    <label>
      Quantity
      <input
        type="number"
        min="1"
        max={fieldLimits.quantity}
        step="1"
        value={draft}
        aria-label={`Quantity for ${line.product.name}`}
        aria-invalid={!valid}
        aria-describedby={!valid ? errorId : undefined}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          const next = Number(value);
          if (
            value !== "" &&
            Number.isInteger(next) &&
            next >= 1 &&
            next <= fieldLimits.quantity
          ) {
            onQuantity(line.product.id, value);
          }
        }}
        onBlur={() => {
          if (!valid) setDraft(String(line.quantity));
        }}
      />
      {!valid && (
        <span id={errorId} className="field-error">
          Enter a whole number from 1 to {fieldLimits.quantity}.
        </span>
      )}
    </label>
  );
}

interface CheckoutFieldProps {
  label: string;
  name: keyof CheckoutFields;
  value: string;
  type?: string;
  error?: string;
  onChange: (value: string) => void;
}

function CheckoutField({
  label,
  name,
  value,
  type = "text",
  error,
  onChange,
}: CheckoutFieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="checkout-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span id={errorId} className="field-error">{error}</span>}
    </div>
  );
}

interface ProductDetailsProps {
  product?: Product;
  loading: boolean;
  error?: string;
  onAdd: (product: Product) => void;
  onClose: () => void;
}

function ProductDetails({
  product,
  loading,
  error,
  onAdd,
  onClose,
}: ProductDetailsProps) {
  return (
    <section className="detail-drawer" aria-labelledby="detail-title">
      <button
        type="button"
        className="detail-close"
        aria-label="Close product details"
        onClick={onClose}
      >
        ×
      </button>
      {loading ? (
        <p role="status">Loading product details…</p>
      ) : error ? (
        <>
          <h2 id="detail-title">Product details unavailable</h2>
          <p role="alert">{error}</p>
        </>
      ) : product ? (
        <>
          <p className="eyebrow">{product.category}</p>
          <h2 id="detail-title">{product.name}</h2>
          <p>{product.description}</p>
          <h3>Why it belongs in your day</h3>
          <ul>
            {product.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          <p>
            <strong>{formatMoney(product.priceCents)}</strong>
            {" · "}
            {product.availability === "in-stock"
              ? "Ready to send"
              : "Limited stock"}
          </p>
          <button type="button" onClick={() => onAdd(product)}>Add to cart</button>
        </>
      ) : null}
    </section>
  );
}
