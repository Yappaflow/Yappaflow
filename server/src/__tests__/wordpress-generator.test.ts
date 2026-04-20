import { describe, it, expect } from "vitest";
import { buildWooCommerceCsv } from "../services/wordpress-generator.service";
import type { IProjectIdentity, IProduct } from "../models/Project.model";

const IDENTITY: IProjectIdentity = {
  businessName:      "Butik Mode",
  tagline:           "Curated fashion for the bold",
  industry:          "fashion",
  tone:              "warm, confident, minimal",
  city:              "Istanbul",
  domainSuggestions: [],
  extractedAt:       new Date("2026-04-20T00:00:00Z"),
};

/** Minimal CSV parser — handles quoted fields with embedded commas / quotes. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

describe("buildWooCommerceCsv", () => {
  it("emits the official WooCommerce Product CSV header row", () => {
    const csv = buildWooCommerceCsv(IDENTITY, []);
    const [header] = parseCsv(csv);
    // Sample the columns we rely on — full list is the WooCommerce importer's
    // own template, we just assert the key ones are present and in position.
    expect(header[0]).toBe("ID");
    expect(header).toContain("Type");
    expect(header).toContain("SKU");
    expect(header).toContain("Name");
    expect(header).toContain("Regular price");
    expect(header).toContain("Categories");
    expect(header).toContain("Attribute 1 name");
    expect(header).toContain("Attribute 1 value(s)");
    expect(header).toContain("Parent");
    expect(header).toContain("Position");
  });

  it("writes a single 'simple' row for a no-variant product", () => {
    const products: IProduct[] = [
      {
        name:        "Silk Scarf",
        price:       45,
        description: "Hand-rolled edges",
        images:      ["https://example.com/scarf.jpg"],
      },
    ];
    const rows = parseCsv(buildWooCommerceCsv(IDENTITY, products));
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);

    expect(rows.length).toBe(1 + 1); // header + one simple row
    expect(rows[1][idx("Type")]).toBe("simple");
    expect(rows[1][idx("SKU")]).toBe("silk-scarf");           // slug of name
    expect(rows[1][idx("Name")]).toBe("Silk Scarf");
    expect(rows[1][idx("Regular price")]).toBe("45.00");      // .toFixed(2)
    expect(rows[1][idx("Description")]).toBe("Hand-rolled edges");
    expect(rows[1][idx("Images")]).toBe("https://example.com/scarf.jpg");
    // industry → "fashion" → capitalized category
    expect(rows[1][idx("Categories")]).toBe("Fashion");
    expect(rows[1][idx("In stock?")]).toBe("1");
    expect(rows[1][idx("Tax status")]).toBe("taxable");
  });

  it("writes a 'variable' parent + N 'variation' rows for multi-variant products", () => {
    const products: IProduct[] = [
      {
        name:        "Linen Shirt",
        price:       89,
        description: "Lightweight linen",
        variantKind: "size",
        variants:    [
          { label: "S" },
          { label: "M" },
          { label: "L" },
          { label: "XL", price: 99 },
        ],
      },
    ];
    const rows = parseCsv(buildWooCommerceCsv(IDENTITY, products));
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);

    // 1 parent + 4 variations = 5 data rows
    expect(rows.length).toBe(1 + 1 + 4);

    // Parent row — the "variable" one
    expect(rows[1][idx("Type")]).toBe("variable");
    expect(rows[1][idx("SKU")]).toBe("linen-shirt");
    expect(rows[1][idx("Name")]).toBe("Linen Shirt");
    expect(rows[1][idx("Regular price")]).toBe("");                // parent has no price
    expect(rows[1][idx("Attribute 1 name")]).toBe("Size");         // capitalized from variantKind
    expect(rows[1][idx("Attribute 1 value(s)")]).toBe("S | M | L | XL");
    expect(rows[1][idx("Attribute 1 visible")]).toBe("1");
    expect(rows[1][idx("Attribute 1 global")]).toBe("1");
    expect(rows[1][idx("Parent")]).toBe("");

    // First variation
    expect(rows[2][idx("Type")]).toBe("variation");
    expect(rows[2][idx("SKU")]).toBe("linen-shirt-s");
    expect(rows[2][idx("Regular price")]).toBe("89.00");
    expect(rows[2][idx("Parent")]).toBe("linen-shirt");
    expect(rows[2][idx("Attribute 1 name")]).toBe("Size");
    expect(rows[2][idx("Attribute 1 value(s)")]).toBe("S");
    expect(rows[2][idx("Position")]).toBe("0");

    // XL variation — overridden price
    const xl = rows[5];
    expect(xl[idx("Type")]).toBe("variation");
    expect(xl[idx("Attribute 1 value(s)")]).toBe("XL");
    expect(xl[idx("Regular price")]).toBe("99.00");
    expect(xl[idx("Position")]).toBe("3");
  });

  it("escapes commas and quotes inside descriptions / names", () => {
    const products: IProduct[] = [
      {
        name:        "Quote, test",
        price:       10,
        description: 'Has a "quote" and a, comma',
      },
    ];
    const csv = buildWooCommerceCsv(IDENTITY, products);

    // Raw CSV has the quoted form.
    expect(csv).toContain('"Quote, test"');
    expect(csv).toContain('"Has a ""quote"" and a, comma"');

    // And parses back to the original strings.
    const rows = parseCsv(csv);
    const nameIdx = rows[0].indexOf("Name");
    const descIdx = rows[0].indexOf("Description");
    expect(rows[1][nameIdx]).toBe("Quote, test");
    expect(rows[1][descIdx]).toBe('Has a "quote" and a, comma');
  });

  it("falls back to 'Variant' when variantKind is missing", () => {
    const products: IProduct[] = [
      {
        name:     "Candle",
        price:    18,
        variants: [{ label: "Vanilla" }, { label: "Cedar" }],
      },
    ];
    const rows = parseCsv(buildWooCommerceCsv(IDENTITY, products));
    const idx = (name: string) => rows[0].indexOf(name);

    // Parent row attribute name
    expect(rows[1][idx("Attribute 1 name")]).toBe("Variant");
    expect(rows[2][idx("Attribute 1 name")]).toBe("Variant");
  });

  it("leaves Categories empty when the identity has no industry", () => {
    const noIndustry: IProjectIdentity = {
      ...IDENTITY,
      industry: undefined,
    };
    const products: IProduct[] = [{ name: "Mug", price: 12 }];
    const rows = parseCsv(buildWooCommerceCsv(noIndustry, products));
    const idx = (name: string) => rows[0].indexOf(name);
    expect(rows[1][idx("Categories")]).toBe("");
    expect(rows[1][idx("Tags")]).toBe("");
  });

  it("joins multiple images with ', ' into the Images column", () => {
    const products: IProduct[] = [
      {
        name:   "Tote Bag",
        price:  30,
        images: [
          "https://example.com/tote-front.jpg",
          "https://example.com/tote-back.jpg",
        ],
      },
    ];
    const rows = parseCsv(buildWooCommerceCsv(IDENTITY, products));
    const idx = (name: string) => rows[0].indexOf(name);
    expect(rows[1][idx("Images")]).toBe(
      "https://example.com/tote-front.jpg, https://example.com/tote-back.jpg"
    );
  });
});
