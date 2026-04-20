import { describe, it, expect } from "vitest";
import { buildProductsCsv } from "../services/shopify-generator.service";
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

function parseCsv(csv: string): string[][] {
  // Minimal CSV parser good enough for these fixtures (handles quoted fields
  // with embedded commas and escaped quotes).
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

describe("buildProductsCsv", () => {
  it("emits a Shopify-compatible header row", () => {
    const csv = buildProductsCsv(IDENTITY, []);
    const [header] = parseCsv(csv);
    expect(header[0]).toBe("Handle");
    expect(header).toContain("Variant Price");
    expect(header).toContain("Option1 Name");
    expect(header).toContain("Image Src");
  });

  it("writes product-level fields only on the first variant row", () => {
    const products: IProduct[] = [
      {
        name:        "Linen Shirt",
        price:       89,
        currency:    "USD",
        description: "Lightweight linen, hand-finished hem.",
        variantKind: "size",
        variants:    [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL", price: 99 }],
      },
    ];
    const rows = parseCsv(buildProductsCsv(IDENTITY, products));
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);

    // 4 variant rows, no extra image rows (no images on product).
    expect(rows.length).toBe(1 + 4);

    // First variant row: full product metadata.
    expect(rows[1][idx("Handle")]).toBe("linen-shirt");
    expect(rows[1][idx("Title")]).toBe("Linen Shirt");
    expect(rows[1][idx("Vendor")]).toBe("Butik Mode");
    expect(rows[1][idx("Option1 Name")]).toBe("Size");
    expect(rows[1][idx("Option1 Value")]).toBe("S");
    expect(rows[1][idx("Variant Price")]).toBe("89");
    expect(rows[1][idx("Status")]).toBe("active");

    // Middle variant row: Title/Vendor blank, price from parent.
    expect(rows[2][idx("Handle")]).toBe("linen-shirt");
    expect(rows[2][idx("Title")]).toBe("");
    expect(rows[2][idx("Option1 Value")]).toBe("M");
    expect(rows[2][idx("Variant Price")]).toBe("89");

    // XL row: price override applied.
    expect(rows[4][idx("Option1 Value")]).toBe("XL");
    expect(rows[4][idx("Variant Price")]).toBe("99");
  });

  it("emits one additional image row per image beyond the first", () => {
    const products: IProduct[] = [
      {
        name:   "Silk Scarf",
        price:  45,
        images: [
          "https://example.com/scarf-front.jpg",
          "https://example.com/scarf-back.jpg",
          "https://example.com/scarf-on-model.jpg",
        ],
      },
    ];
    const rows = parseCsv(buildProductsCsv(IDENTITY, products));
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);

    // 1 variant row (default Title) + 2 extra image rows = 3 data rows.
    expect(rows.length).toBe(1 + 3);
    expect(rows[1][idx("Image Src")]).toBe("https://example.com/scarf-front.jpg");
    expect(rows[1][idx("Image Position")]).toBe("1");
    expect(rows[2][idx("Image Src")]).toBe("https://example.com/scarf-back.jpg");
    expect(rows[2][idx("Image Position")]).toBe("2");
    expect(rows[3][idx("Image Src")]).toBe("https://example.com/scarf-on-model.jpg");
    expect(rows[3][idx("Image Position")]).toBe("3");
  });

  it("escapes commas and quotes in descriptions", () => {
    const products: IProduct[] = [
      {
        name:        "Quote, test",
        price:       10,
        description: 'Has a "quote" and a, comma',
      },
    ];
    const csv = buildProductsCsv(IDENTITY, products);
    // The description and title must be safely quoted in the raw CSV.
    expect(csv).toContain('"Quote, test"');
    expect(csv).toContain('"<p>Has a ""quote"" and a, comma</p>"');

    // And still parse back to the original strings.
    const rows = parseCsv(csv);
    const titleIdx = rows[0].indexOf("Title");
    const bodyIdx  = rows[0].indexOf("Body (HTML)");
    expect(rows[1][titleIdx]).toBe("Quote, test");
    expect(rows[1][bodyIdx]).toBe('<p>Has a "quote" and a, comma</p>');
  });

  it("falls back to a single 'Default Title' row when no variants are given", () => {
    const products: IProduct[] = [{ name: "Mug", price: 12 }];
    const rows = parseCsv(buildProductsCsv(IDENTITY, products));
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);

    expect(rows.length).toBe(1 + 1);
    expect(rows[1][idx("Option1 Name")]).toBe("Title");
    expect(rows[1][idx("Option1 Value")]).toBe("Default Title");
  });
});
