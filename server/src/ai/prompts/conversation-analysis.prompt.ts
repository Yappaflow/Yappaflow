/**
 * Conversation Analysis Prompt
 *
 * Instructs Claude to analyze a client conversation thread and extract
 * structured project requirements + a full design system recommendation.
 */

export function getConversationAnalysisPrompt(): string {
  return `## Task: Analyze Client Conversation

You are analyzing a conversation between a web agency and their client. Extract structured project requirements and generate a complete design system recommendation.

## Instructions

Read the entire conversation thread carefully. Extract every detail about what the client wants built. Fill in gaps with intelligent defaults based on the client's industry, references, and tone.

### Design Intelligence

When interpreting the client's words, apply this design reasoning:

**Industry → Aesthetic Mapping:**
- Tech/SaaS → bold geometric, dark mode, strong accent, Studio Freight aesthetic
- Fashion/Luxury → serif display, minimal, lots of white space, AREA 17 aesthetic
- Restaurant/Food → warm colors, editorial photography focus, Locomotive aesthetic
- Creative/Agency → experimental, playful, Hello Monday aesthetic
- E-commerce → product-focused, conversion-optimized, clean grid system
- Corporate/B2B → professional, systematic, Instrument-style design tokens

**Vague Statement Interpretation:**
- "I want something like Amazon" → e-commerce, product grid, search-focused, Shopify or custom
- "Something modern and clean" → dark mode, geometric sans, minimal animations
- "Make it pop" → bold accent color, dramatic typography scale, signature animations
- "Professional looking" → serif/sans pairing, restrained motion, systematic spacing
- "I want it to stand out" → experimental layout, signature moment, custom interactions

### Design System Generation Rules

**Colors:** Never use pure black (#000) or pure white (#fff). Use warm variants:
- Dark: #0a0a0a, #0e0e0e, #1a1a1a
- Light: #fafaf9, #f5f2eb, #f8f8f8
- Accent: one bold, saturated color used sparingly

**Typography:** Choose from premium/quality fonts:
- Display options: Space Grotesk, Instrument Serif, Fraunces, Syne, Playfair Display, Cormorant Garamond
- Body options: Plus Jakarta Sans, DM Sans, Outfit, Inter (ONLY for body, never display)
- Pair by contrast principle: weight, width, style, or era

**Easing:** Always specify custom cubic-bezier curves:
- Primary (most UI): cubic-bezier(0.16, 1, 0.3, 1) — expo out
- Dramatic (entrances): cubic-bezier(0.87, 0, 0.13, 1) — expo in-out
- Symmetric (toggles): cubic-bezier(0.25, 1, 0.5, 1) — quart out

**Animation Style:** Choose which agency aesthetic fits the client's brand:
- "locomotive" — refined, editorial, extreme smooth scroll, split text reveals
- "studio-freight" — bold typography, horizontal scroll, magnetic interactions
- "area17" — restrained, systematic, content-driven, accessibility-first
- "hello-monday" — playful, inventive, physics-based, experimental

### Brand Essence Questions (answer from conversation clues)

1. **Brand Essence:** What single word captures the soul of this project?
2. **Visual Tension:** What opposing forces create interest? (e.g., "minimal vs bold")
3. **Signature Moment:** What will people screenshot and share?

## Output Format

Respond with ONLY a JSON object matching this exact schema. No markdown, no commentary, just JSON:

\`\`\`json
{
  "projectType": "e-commerce | portfolio | landing-page | blog | web-app | corporate | restaurant | saas",
  "platformPreference": "shopify | wordpress | ikas | custom",
  "confidence": 0.85,
  "designSystem": {
    "colorPalette": {
      "primary": "#0a0a0a",
      "secondary": "#fafaf9",
      "accent": "#ff4d00",
      "background": "#0a0a0a",
      "text": "#fafaf9"
    },
    "typography": {
      "displayFont": "Space Grotesk",
      "bodyFont": "DM Sans",
      "heroScale": "clamp(4rem, 2rem + 8vw, 12rem)",
      "bodyScale": "1.125rem",
      "tracking": "-0.03em"
    },
    "easing": {
      "primary": "cubic-bezier(0.16, 1, 0.3, 1)",
      "dramatic": "cubic-bezier(0.87, 0, 0.13, 1)",
      "symmetric": "cubic-bezier(0.25, 1, 0.5, 1)"
    },
    "spacing": {
      "sectionPadding": "clamp(4rem, 10vh, 8rem)",
      "gridGutter": "clamp(1rem, 2vw, 2rem)",
      "gridMargin": "clamp(1rem, 5vw, 6rem)"
    },
    "animationStyle": "locomotive | studio-freight | area17 | hello-monday",
    "scrollBehavior": "smooth-lenis | native | locomotive-scroll",
    "signatureMoment": "description of the screenshot-worthy moment",
    "mood": "single word"
  },
  "designRequirements": {
    "style": "dark mode, bento-grid, asymmetric layouts",
    "references": ["https://example.com"],
    "responsive": true,
    "darkMode": true
  },
  "contentRequirements": {
    "pages": ["Home", "About", "Products", "Contact"],
    "features": ["product gallery", "contact form", "blog"],
    "integrations": ["payment gateway", "email signup"],
    "languages": ["en", "tr"]
  },
  "businessContext": {
    "industry": "fashion",
    "targetAudience": "young professionals 25-35",
    "competitors": ["competitor1.com"],
    "timeline": "2 weeks",
    "budgetSignal": "premium"
  },
  "brandEssence": "bold",
  "visualTension": "minimal structure vs maximum impact",
  "signatureMoment": "Hero text fills viewport with staggered char reveal"
}
\`\`\`

If a field cannot be determined from the conversation, use your best judgment based on the industry and context. Set the confidence field lower (0.3-0.6) when you are guessing.`;
}
