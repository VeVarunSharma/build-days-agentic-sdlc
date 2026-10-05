import {
  cartQuantitySchema,
  fieldLimits,
  productQuerySchema,
} from "../src/shared/contracts.js";

describe("commerce contracts", () => {
  it("normalizes valid product queries", () => {
    expect(productQuerySchema.parse({ q: "  lamp  ", category: "office" })).toEqual({
      q: "lamp",
      category: "office",
    });
  });

  it("rejects unsupported categories and oversized search", () => {
    const result = productQuerySchema.safeParse({
      q: "x".repeat(fieldLimits.search + 1),
      category: "electronics",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["q", "category"]),
      );
    }
  });

  it("bounds cart quantities", () => {
    expect(cartQuantitySchema.parse({ quantity: 3 })).toEqual({ quantity: 3 });
    expect(cartQuantitySchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(
      cartQuantitySchema.safeParse({ quantity: fieldLimits.quantity + 1 }).success,
    ).toBe(false);
  });
});
