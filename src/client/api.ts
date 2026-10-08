import type {
  ApiError,
  Product,
  ProductCategory,
  ProductListResponse,
  ShoppingMissionRequest,
  ValidatedMissionPlan,
} from "../shared/contracts.js";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
  });

  let body: T | ApiError;
  try {
    body = (await response.json()) as T | ApiError;
  } catch {
    throw new ApiRequestError("The catalogue returned an invalid response.");
  }

  if (!response.ok) {
    const apiError = body as ApiError;
    throw new ApiRequestError(
      apiError.error?.message ?? "Something went wrong. Try again.",
      apiError.error?.fieldErrors,
      apiError.error?.code,
    );
  }

  return body as T;
}

export interface ProductFilters {
  q?: string;
  category?: ProductCategory;
}

export const listProducts = (filters: ProductFilters = {}): Promise<ProductListResponse> => {
  const search = new URLSearchParams();
  const query = filters.q?.trim();
  if (query) search.set("q", query);
  if (filters.category) search.set("category", filters.category);
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<ProductListResponse>(`/api/products${suffix}`);
};

export const getProduct = async (id: string): Promise<Product> => {
  const result = await request<{ product: Product }>(
    `/api/products/${encodeURIComponent(id)}`,
  );
  return result.product;
};

export const planShoppingMission = async (
  mission: ShoppingMissionRequest,
  signal?: AbortSignal,
): Promise<ValidatedMissionPlan> => {
  const result = await request<{ plan: ValidatedMissionPlan }>(
    "/api/shopping-missions",
    {
      method: "POST",
      body: JSON.stringify(mission),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      signal,
    },
  );
  return result.plan;
};
