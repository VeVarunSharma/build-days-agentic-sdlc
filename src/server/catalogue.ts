import type { Product, ProductQuery } from "../shared/contracts.js";

export class ProductNotFoundError extends Error {}

export interface ProductCatalogue {
  list(query?: ProductQuery): Promise<Product[]>;
  getById(id: string): Promise<Product>;
  checkHealth(): Promise<void>;
}

export const products: Product[] = [
  {
    id: "aurora-desk-lamp",
    name: "Aurora Desk Lamp",
    shortDescription: "Warm, focused light with a compact adjustable arm.",
    description:
      "A softly diffused desk lamp designed for focused work, reading, and calm evening light.",
    category: "office",
    priceCents: 4299,
    rating: 4.7,
    reviewCount: 184,
    availability: "in-stock",
    badge: "Workshop pick",
    features: ["Three brightness levels", "USB-C powered", "Folds flat"],
    accent: "sunset",
  },
  {
    id: "cloudrest-throw",
    name: "Cloudrest Throw",
    shortDescription: "A lightweight woven throw for couches and reading nooks.",
    description:
      "A breathable, machine-washable throw with a textured weave and an easygoing neutral palette.",
    category: "home",
    priceCents: 5899,
    rating: 4.8,
    reviewCount: 92,
    availability: "limited",
    features: ["Machine washable", "Recycled fibers", "130 x 170 cm"],
    accent: "cloud",
  },
  {
    id: "trailmark-bottle",
    name: "Trailmark Bottle",
    shortDescription: "Insulated stainless bottle for everyday adventures.",
    description:
      "A leak-resistant insulated bottle that keeps drinks cold during commutes, walks, and day trips.",
    category: "outdoors",
    priceCents: 3199,
    rating: 4.6,
    reviewCount: 267,
    availability: "in-stock",
    badge: "Popular",
    features: ["750 ml", "Leak-resistant lid", "BPA-free"],
    accent: "forest",
  },
  {
    id: "tideline-picnic-blanket",
    name: "Tideline Picnic Blanket",
    shortDescription: "Packable blanket with a water-resistant backing.",
    description:
      "A roomy outdoor blanket that folds into its own carry sleeve for parks, beaches, and backyards.",
    category: "outdoors",
    priceCents: 6499,
    rating: 4.5,
    reviewCount: 71,
    availability: "in-stock",
    features: ["Water-resistant base", "Carry handle", "Seats four"],
    accent: "ocean",
  },
  {
    id: "nesting-prep-bowls",
    name: "Nesting Prep Bowls",
    shortDescription: "Four colorful bowls sized for prep, serving, and snacks.",
    description:
      "A space-saving set of durable prep bowls with non-slip bases and clearly marked capacities.",
    category: "kitchen",
    priceCents: 2799,
    rating: 4.9,
    reviewCount: 143,
    availability: "in-stock",
    badge: "Top rated",
    features: ["Set of four", "Dishwasher safe", "Non-slip bases"],
    accent: "berry",
  },
  {
    id: "emberline-kettle",
    name: "Emberline Kettle",
    shortDescription: "Compact electric kettle with a quiet boil.",
    description:
      "A one-liter electric kettle with automatic shutoff and a comfortable stay-cool handle.",
    category: "kitchen",
    priceCents: 7499,
    rating: 4.4,
    reviewCount: 118,
    availability: "limited",
    features: ["1 liter", "Auto shutoff", "Cord storage"],
    accent: "ember",
  },
  {
    id: "papertrail-notebook-set",
    name: "Papertrail Notebook Set",
    shortDescription: "Three lay-flat notebooks for plans, sketches, and notes.",
    description:
      "A set of thread-bound notebooks with dot-grid pages and sturdy covers in three original colors.",
    category: "office",
    priceCents: 2299,
    rating: 4.6,
    reviewCount: 205,
    availability: "in-stock",
    features: ["Three notebooks", "Dot-grid pages", "Lay-flat binding"],
    accent: "ink",
  },
  {
    id: "harbor-catchall-tray",
    name: "Harbor Catchall Tray",
    shortDescription: "A simple tray for keys, cables, and daily essentials.",
    description:
      "A durable molded tray that keeps small essentials together on an entry table, shelf, or desk.",
    category: "home",
    priceCents: 1899,
    rating: 4.3,
    reviewCount: 64,
    availability: "in-stock",
    features: ["Easy-clean surface", "Soft-touch base", "28 cm wide"],
    accent: "harbor",
  },
];

export class InMemoryProductCatalogue implements ProductCatalogue {
  constructor(private readonly items: Product[] = products) {}

  list(query: ProductQuery = { q: "" }): Promise<Product[]> {
    const search = query.q.toLocaleLowerCase();
    return Promise.resolve(
      this.items.filter((product) => {
        const matchesCategory =
          query.category === undefined || product.category === query.category;
        const searchable =
          `${product.name} ${product.shortDescription} ${product.description} ${product.features.join(" ")}`.toLocaleLowerCase();
        return matchesCategory && (!search || searchable.includes(search));
      }),
    );
  }

  getById(id: string): Promise<Product> {
    const product = this.items.find((candidate) => candidate.id === id);
    return product
      ? Promise.resolve(product)
      : Promise.reject(new ProductNotFoundError(`Product ${id} was not found.`));
  }

  checkHealth(): Promise<void> {
    if (this.items.length === 0) {
      return Promise.reject(new Error("Product catalogue is empty."));
    }
    return Promise.resolve();
  }
}

export const createCatalogue = (): ProductCatalogue =>
  new InMemoryProductCatalogue();
