export function getExtractIdentityPrompt(): string {
  return `## Task: Extract Business Identity

You are reading a conversation between a web agency and their client. Your job is to extract the client's business identity so the agency can register a domain and generate a marketing website.

### What to extract

- **businessName** — the client's brand or company name (use the name the client uses for themselves; never use the agency's name)
- **tagline** — a short one-liner that captures the offering (infer from context if not stated)
- **industry** — one of: fashion, food, tech, saas, restaurant, ecommerce, services, creative, beauty, health, education, real-estate, other
- **tone** — 2-4 comma-separated adjectives describing brand voice (e.g. "warm, confident, minimal")
- **city** — the client's primary city if mentioned
- **domainSuggestions** — exactly 5 available-feeling .com (or .co / .shop) domain candidates built around the business name. Prefer short, pronounceable, brandable variations. Avoid hyphens and numbers.

### Output

Respond with ONLY a JSON object, no markdown fences, no commentary:

\`\`\`
{
  "businessName": "string",
  "tagline": "string (optional)",
  "industry": "string",
  "tone": "string",
  "city": "string (optional)",
  "domainSuggestions": ["name.com", "name.co", "getname.com", "name.shop", "namehq.com"]
}
\`\`\`

### Sparse-data fallback

If the conversation is too short or ambiguous to name the business:
- Use the most distinctive proper noun in the conversation as \`businessName\`, OR
- If no proper noun exists, use "{IndustryName} Studio" based on the inferred industry (e.g. "Fashion Studio")

Always return all required fields. Never ask for clarification. Never include explanatory prose.`;
}
