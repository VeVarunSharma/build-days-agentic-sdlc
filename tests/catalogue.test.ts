import {
  InMemoryProductCatalogue,
  ProductNotFoundError,
  products,
} from "../src/server/catalogue.js";

describe("product catalogue", () => {
  it("provides stable deterministic products", async () => {
    const catalogue = new InMemoryProductCatalogue();

    expect(await catalogue.list()).toEqual(products);
    expect(products.map((product) => product.id)).toEqual([
      "aurora-desk-lamp",
      "cloudrest-throw",
      "trailmark-bottle",
      "tideline-picnic-blanket",
      "nesting-prep-bowls",
      "emberline-kettle",
      "papertrail-notebook-set",
      "harbor-catchall-tray",
    ]);
  });

  it("filters by category and case-insensitive search", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(catalogue.list({ q: "LAMP", category: "office" })).resolves.toEqual([
      expect.objectContaining({ id: "aurora-desk-lamp" }),
    ]);
    await expect(catalogue.list({ q: "", category: "kitchen" })).resolves.toHaveLength(2);
  });

  it("returns product details and rejects missing products", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(catalogue.getById("trailmark-bottle")).resolves.toMatchObject({
      name: "Trailmark Bottle",
      priceCents: 3199,
    });
    await expect(catalogue.getById("missing")).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});
