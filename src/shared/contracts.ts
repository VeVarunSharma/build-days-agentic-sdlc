import { z } from "zod";

export const productCategories = [
  "home",
  "outdoors",
  "office",
  "kitchen",
] as const;

export const fieldLimits = {
  search: 80,
  quantity: 20,
} as const;

export const productQuerySchema = z.object({
  q: z.string().trim().max(fieldLimits.search).optional().default(""),
  category: z.enum(productCategories).optional(),
});

export const cartQuantitySchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(fieldLimits.quantity, `Quantity cannot exceed ${fieldLimits.quantity}.`),
});

export type ProductCategory = (typeof productCategories)[number];
export type ProductQuery = z.infer<typeof productQuerySchema>;

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ProductCategory;
  priceCents: number;
  rating: number;
  reviewCount: number;
  availability: "in-stock" | "limited";
  badge?: string;
  features: string[];
  accent: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  query: ProductQuery;
  categories: ProductCategory[];
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
