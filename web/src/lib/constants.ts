export const NAV_LINKS = [
  { key: "platform", href: "#features" },
  { key: "solutions", href: "#integrations" },
  { key: "developers", href: "#api" },
  { key: "pricing", href: "#pricing" },
  { key: "company", href: "#company" },
] as const;

export const FEATURE_TABS = [
  { key: "listen", icon: "Headphones" },
  { key: "build", icon: "Code" },
  { key: "ship", icon: "Rocket" },
] as const;

export const PLATFORM_LOGOS = [
  { name: "Shopify", icon: "ShoppingBag" },
  { name: "WordPress", icon: "Globe" },
  { name: "Webflow", icon: "Layout" },
  { name: "IKAS", icon: "Store" },
  { name: "Namecheap", icon: "Globe2" },
  { name: "Hostinger", icon: "Server" },
] as const;

export const INTEGRATION_CARDS = [
  { key: "shopify", icon: "ShoppingBag" },
  { key: "wordpress", icon: "Globe" },
  { key: "webflow", icon: "Layout" },
  { key: "ikas", icon: "Store" },
  { key: "namecheap", icon: "Globe2" },
  { key: "hostinger", icon: "Server" },
] as const;

export const API_REQUEST_EXAMPLE = `curl -X POST "api.yappaflow.com/v1/generate" \\
  -H "Authorization: Bearer sk_key..." \\
  -d '{
    "transcript": "Client wants a modern e-commerce...",
    "platform": "shopify",
    "template": "minimal_store",
    "locale": ["en", "tr"]
  }'`;

export const API_RESPONSE_EXAMPLE = `{
  "status": "success",
  "project_id": "proj_abc123",
  "build": {
    "framework": "next.js",
    "platform": "shopify",
    "pages": 12,
    "components": 34
  },
  "deployment": {
    "url": "https://client-store.myshopify.com",
    "status": "live",
    "dns_configured": true
  }
}`;
