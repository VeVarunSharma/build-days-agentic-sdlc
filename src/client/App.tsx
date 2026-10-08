import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  fieldLimits,
  productCategories,
  shoppingMissionRequestSchema,
  type CartLine,
  type Product,
  type ProductCategory,
  type ValidatedMissionPlan,
} from "../shared/contracts.js";
import {
  ApiRequestError,
  getProduct,
  listProducts,
  planShoppingMission,
} from "./api.js";
import {
  addMissionPlanToCart,
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

const dollarsToCents = (value: string): number | undefined => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(dollars) || !Number.isSafeInteger(cents)) {
    return undefined;
  }
  const total = dollars * 100 + cents;
  return Number.isSafeInteger(total) ? total : undefined;
};

const missionErrorContent = (error: unknown): { title: string; message: string } => {
  const code = error instanceof ApiRequestError ? error.code : undefined;
  switch (code) {
    case "MISSION_PLANNER_NOT_CONFIGURED":
    case "MISSION_PLANNER_UNCONFIGURED":
      return {
        title: "Basket planner is not configured",
        message: "The basket planner is not available in this environment yet.",
      };
    case "MISSION_PLANNER_UNAVAILABLE":
      return {
        title: "Basket planner is temporarily unavailable",
        message: "Try building your basket again in a moment.",
      };
    case "MISSION_PROPOSAL_INVALID":
      return {
        title: "The proposed basket was invalid",
        message: "No products were added. Try describing your goal another way.",
      };
    default:
      return {
        title: "We could not build your basket",
        message: "Something went wrong. Try again.",
      };
  }
};

interface CheckoutFields {
  name: string;
  email: string;
  address: string;
}

const emptyCheckout: CheckoutFields = { name: "", email: "", address: "" };

interface MissionFields {
  goal: string;
  budget: string;
  maxItems: string;
}

const emptyMission: MissionFields = { goal: "", budget: "", maxItems: "5" };

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
  const [mission, setMission] = useState(emptyMission);
  const [missionErrors, setMissionErrors] = useState<
    Partial<Record<keyof MissionFields, string>>
  >({});
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionError, setMissionError] = useState<{
    title: string;
    message: string;
  }>();
  const [missionNotice, setMissionNotice] = useState("");
  const [missionPlan, setMissionPlan] = useState<ValidatedMissionPlan>();
  const missionRequest = useRef(0);
  const missionAbort = useRef<AbortController | undefined>(undefined);
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

  useEffect(
    () => () => {
      missionRequest.current += 1;
      missionAbort.current?.abort();
    },
    [],
  );

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

  async function submitMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budgetCents = dollarsToCents(mission.budget);
    const maxItems = Number(mission.maxItems);
    const parsed = shoppingMissionRequestSchema.safeParse({
      goal: mission.goal,
      budgetCents,
      maxItems,
    });
    const errors: Partial<Record<keyof MissionFields, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "goal" && !errors.goal) errors.goal = issue.message;
        if (field === "budgetCents" && !errors.budget) {
          errors.budget =
            budgetCents === undefined
              ? "Enter a dollar amount with no more than two decimal places."
              : issue.message;
        }
        if (field === "maxItems" && !errors.maxItems) {
          errors.maxItems = issue.message;
        }
      }
    }
    if (budgetCents === undefined && !errors.budget) {
      errors.budget = "Enter a dollar amount with no more than two decimal places.";
    }
    setMissionErrors(errors);
    if (!parsed.success || Object.keys(errors).length > 0) return;

    missionAbort.current?.abort();
    const controller = new AbortController();
    missionAbort.current = controller;
    const requestId = missionRequest.current + 1;
    missionRequest.current = requestId;
    setMissionLoading(true);
    setMissionError(undefined);
    setMissionNotice("");
    setMissionPlan(undefined);
    try {
      const plan = await planShoppingMission(parsed.data, controller.signal);
      if (missionRequest.current === requestId && !controller.signal.aborted) {
        setMissionPlan(plan);
        setMissionNotice("Your basket plan is ready. Review it before adding it.");
      }
    } catch (error) {
      if (
        missionRequest.current === requestId &&
        !controller.signal.aborted
      ) {
        setMissionError(missionErrorContent(error));
      }
    } finally {
      if (missionRequest.current === requestId) {
        setMissionLoading(false);
      }
    }
  }

  function cancelMission() {
    missionRequest.current += 1;
    missionAbort.current?.abort();
    setMissionLoading(false);
    setMissionError(undefined);
    setMissionNotice("Basket planning cancelled.");
  }

  function addMissionBundle(plan: ValidatedMissionPlan) {
    setCart((current) => {
      const merged = addMissionPlanToCart(current, plan.items);
      const requestedCount = plan.items.reduce(
        (total, item) => total + item.quantity,
        0,
      );
      const addedCount = cartItemCount(merged) - cartItemCount(current);
      setCartNotice(
        addedCount < requestedCount
          ? `Bundle added with quantity limits applied. No product can exceed ${fieldLimits.quantity}.`
          : `${plan.title} added to your cart.`,
      );
      return merged;
    });
    setConfirmation("");
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
        <MissionPlanner
          fields={mission}
          errors={missionErrors}
          loading={missionLoading}
          error={missionError}
          notice={missionNotice}
          plan={missionPlan}
          onChange={(fields) => {
            missionRequest.current += 1;
            missionAbort.current?.abort();
            setMission(fields);
            setMissionErrors({});
            setMissionPlan(undefined);
            setMissionError(undefined);
            setMissionNotice("");
            setMissionLoading(false);
          }}
          onSubmit={(event) => void submitMission(event)}
          onCancel={cancelMission}
          onAddBundle={addMissionBundle}
        />

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

interface MissionPlannerProps {
  fields: MissionFields;
  errors: Partial<Record<keyof MissionFields, string>>;
  loading: boolean;
  error?: { title: string; message: string };
  notice: string;
  plan?: ValidatedMissionPlan;
  onChange: (fields: MissionFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onAddBundle: (plan: ValidatedMissionPlan) => void;
}

function MissionPlanner({
  fields,
  errors,
  loading,
  error,
  notice,
  plan,
  onChange,
  onSubmit,
  onCancel,
  onAddBundle,
}: MissionPlannerProps) {
  return (
    <section className="mission-planner" aria-labelledby="mission-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Plan a complete shop</p>
          <h2 id="mission-title">Build my basket</h2>
        </div>
        <span>Review before adding</span>
      </div>
      <p>
        Tell us what you need, your budget, and the most items you want. The
        planner suggests a bundle without changing your cart.
      </p>
      <form className="mission-form" onSubmit={onSubmit} noValidate>
        <MissionField
          label="Shopping goal"
          name="mission-goal"
          value={fields.goal}
          error={errors.goal}
          maxLength={fieldLimits.missionGoal}
          placeholder="Set up a comfortable home office"
          onChange={(goal) => onChange({ ...fields, goal })}
        />
        <MissionField
          label="Budget (dollars)"
          name="mission-budget"
          value={fields.budget}
          error={errors.budget}
          inputMode="decimal"
          placeholder="150.00"
          onChange={(budget) => onChange({ ...fields, budget })}
        />
        <MissionField
          label="Maximum items"
          name="mission-max-items"
          value={fields.maxItems}
          error={errors.maxItems}
          type="number"
          min={1}
          max={fieldLimits.missionMaxItems}
          step={1}
          onChange={(maxItems) => onChange({ ...fields, maxItems })}
        />
        <div className="mission-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Building basket…" : "Build my basket"}
          </button>
          {loading && (
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="mission-status" aria-live="polite">
        {loading && <p role="status">Building a basket for your shopping goal…</p>}
        {!loading && error && (
          <div className="mission-error" role="alert">
            <h3>{error.title}</h3>
            <p>{error.message}</p>
          </div>
        )}
        {!loading && !error && notice && <p role="status">{notice}</p>}
      </div>
      {plan && (
        <MissionPlan plan={plan} onAddBundle={() => onAddBundle(plan)} />
      )}
    </section>
  );
}

interface MissionFieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  type?: string;
  inputMode?: "decimal";
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}

function MissionField({
  label,
  name,
  value,
  error,
  type = "text",
  inputMode,
  placeholder,
  maxLength,
  min,
  max,
  step,
  onChange,
}: MissionFieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="mission-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span id={errorId} className="field-error">{error}</span>}
    </div>
  );
}

function MissionPlan({
  plan,
  onAddBundle,
}: {
  plan: ValidatedMissionPlan;
  onAddBundle: () => void;
}) {
  return (
    <section className="mission-plan" aria-labelledby="mission-plan-title">
      <div>
        <p className="eyebrow">Suggested bundle</p>
        <h3 id="mission-plan-title">{plan.title}</h3>
        <p>{plan.summary}</p>
      </div>
      <ul className="mission-items">
        {plan.items.map((item) => (
          <li key={item.product.id}>
            <div
              className="mission-product-art"
              style={{ "--accent": item.product.accent } as React.CSSProperties}
              aria-hidden="true"
            >
              {item.product.name.charAt(0)}
            </div>
            <div>
              <h4>{item.product.name}</h4>
              <p>{item.reason}</p>
              <span>
                {item.quantity} × {formatMoney(item.product.priceCents)}
              </span>
            </div>
            <strong>{formatMoney(item.lineTotalCents)}</strong>
          </li>
        ))}
      </ul>
      <p className="mission-total">
        <span>Bundle total</span>
        <strong>{formatMoney(plan.totalCents)}</strong>
      </p>
      {plan.limitations.length > 0 && (
        <div className="mission-limitations">
          <h4>Things to know</h4>
          <ul>
            {plan.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" onClick={onAddBundle}>Add bundle to cart</button>
    </section>
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
