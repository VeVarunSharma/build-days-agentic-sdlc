import {
  fieldLimits,
  type CartLine,
  type Product,
  type ValidatedMissionPlanLine,
} from "../shared/contracts.js";

export const addToCart = (cart: CartLine[], product: Product): CartLine[] => {
  const existing = cart.find((line) => line.product.id === product.id);
  if (!existing) return [...cart, { product, quantity: 1 }];
  if (existing.quantity >= fieldLimits.quantity) return cart;
  return cart.map((line) =>
    line.product.id === product.id
      ? { ...line, quantity: line.quantity + 1 }
      : line,
  );
};

export const removeFromCart = (cart: CartLine[], productId: string): CartLine[] =>
  cart.filter((line) => line.product.id !== productId);

export const setCartQuantity = (
  cart: CartLine[],
  productId: string,
  quantity: number,
): CartLine[] => {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > fieldLimits.quantity
  ) {
    return cart;
  }
  return cart.map((line) =>
    line.product.id === productId ? { ...line, quantity } : line,
  );
};

export const cartItemCount = (cart: CartLine[]): number =>
  cart.reduce((total, line) => total + line.quantity, 0);

export const cartSubtotalCents = (cart: CartLine[]): number =>
  cart.reduce(
    (total, line) => total + line.product.priceCents * line.quantity,
    0,
  );

export const addMissionPlanToCart = (
  cart: CartLine[],
  items: ValidatedMissionPlanLine[],
): CartLine[] =>
  items.reduce((nextCart, item) => {
    let merged = nextCart;
    for (let count = 0; count < item.quantity; count += 1) {
      merged = addToCart(merged, item.product);
    }
    return merged;
  }, cart);
