export function getExtractIdentityPrompt(): string {
  return `## Task: Extract Business Identity

You are reading a conversation between a web agency and their client. Your job is to
extract the client's business identity so the agency can register a domain and
generate a marketing website. When the client describes specific products they sell,
you must also extract a structured product catalog.

### What to extract

- **businessName** — the client's brand or company name (use the name the client uses
  for themselves; never use the agency's name)
- **tagline** — a short one-liner that captures the offering (infer from context if not stated)
- **industry** — one of: fashion, food, tech, saas, restaurant, ecommerce, services,
  creative, beauty, health, education, real-estate, other
- **tone** — 2-4 comma-separated adjectives describing brand voice (e.g. "warm, confident, minimal")
- **city** — the client's primary city if mentioned
- **domainSuggestions** — exactly 5 available-feeling .com (or .co / .shop) domain
  candidates built around the business name. Prefer short, pronounceable, brandable
  variations. Avoid hyphens and numbers.
- **products** — see below. ONLY when the conversation makes the business look like a
  shop and the client mentions concrete products.

### Products (e-commerce only)

If the industry is \`ecommerce\`, \`fashion\`, \`food\`, \`beauty\`, or \`health\` AND the
client mentions specific items they sell (with names and/or prices), extract them as
an array. Up to 8 products. Each product:

\`\`\`
{
  "name":        "string (required)",
  "price":       number (required, in the currency below; pick a sensible market price
                 if the client gave a range or no number),
  "currency":    "USD" | "EUR" | "TRY" | "GBP" | etc. (default "USD" if unsure),
  "description": "string (1–2 sentences)",
  "variantKind": "size" | "color" | "flavor" | "weight" | null,
  "variants":    [
    { "label": "S" }, { "label": "M" }, { "label": "L" }, { "label": "XL" }
  ]
}
\`\`\`

Variant rules:
- Apparel / shoes → variants are sizes (\`variantKind: "size"\`). Default set
  \`["XS", "S", "M", "L", "XL"]\` unless the client specifies otherwise.
- Cosmetics / paint / candles → variants are colors or scents.
- Coffee / tea / snacks → variants are weights or flavors.
- If a product has no meaningful variants, omit \`variantKind\` and use an empty array.

If the business is clearly NOT a shop (services, agency, consultancy, restaurant
without an online menu, etc.), omit the \`products\` field entirely or return an empty
array — do NOT invent products.

### Output

Respond with ONLY a JSON object, no markdown fences, no commentary:

\`\`\`
{
  "businessName": "string",
  "tagline": "string (optional)",
  "industry": "string",
  "tone": "string",
  "city": "string (optional)",
  "domainSuggestions": ["name.com", "name.co", "getname.com", "name.shop", "namehq.com"],
  "products": [
    {
      "name": "Linen Shirt",
      "price": 89,
      "currency": "USD",
      "description": "Lightweight linen, hand-finished hem.",
      "variantKind": "size",
      "variants": [{ "label": "S" }, { "label": "M" }, { "label": "L" }, { "label": "XL" }]
    }
  ]
}
\`\`\`

### Sparse-data fallback

If the conversation is too short or ambiguous to name the business:
- Use the most distinctive proper noun in the conversation as \`businessName\`, OR
- If no proper noun exists, use "{IndustryName} Studio" based on the inferred industry
  (e.g. "Fashion Studio")

Always return all required fields. Never ask for clarification. Never include
explanatory prose.`;
}
