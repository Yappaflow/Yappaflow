import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface ExhibitNewsletterProps {
  eyebrow?:       string;
  heading:        string;
  subheading?:    string;
  /** Button label. Default "Subscribe". */
  submitLabel?:   string;
  /** Placeholder text. Default "you@studio.com". */
  placeholder?:   string;
  /** Form action URL. Leave empty — the agency wires the real endpoint post-deploy. */
  action?:        string;
  /** Small print shown under the form (e.g., "We'll never share your email"). */
  fineprint?:     string;
  id?:            string;
  className?:     string;
}

/**
 * <ExhibitNewsletter> — inline email-capture exhibit.
 *
 * A simple `<form method="post">` with a single email input and submit.
 * Uses `name="email"` so agencies can wire Mailchimp/Klaviyo/Beehiiv by
 * pointing `action` at their provider. Works without JS — no state,
 * no useEffect.
 */
export function ExhibitNewsletter({
  eyebrow,
  heading,
  subheading,
  submitLabel = "Subscribe",
  placeholder = "you@studio.com",
  action = "",
  fineprint,
  id,
  className,
}: ExhibitNewsletterProps) {
  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-newsletter", className)}>
      <Frame span={10} offset="center">
        <Reveal beat="structure" variant="fade-translate" trigger="in-view">
          <Stack rhythm="breath" align="start">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <Display as="h2" size="md" tracking="tight">
              {heading}
            </Display>
            {subheading && (
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                {subheading}
              </Body>
            )}
            <form
              method="post"
              action={action}
              data-form-action={action}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--ff-space-3)",
                marginTop: "var(--ff-space-3)",
                maxWidth: 480,
                width: "100%",
              }}
            >
              <label htmlFor={`${id ?? "newsletter"}-email`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Email
              </label>
              <input
                id={`${id ?? "newsletter"}-email`}
                type="email"
                name="email"
                required
                placeholder={placeholder}
                style={{
                  flex: "1 1 220px",
                  padding: "var(--ff-space-3) var(--ff-space-4)",
                  background: "transparent",
                  color: "var(--ff-text-primary)",
                  border: "1px solid var(--ff-text-primary)",
                  borderRadius: "var(--ff-radius-sharp)",
                  fontFamily: "var(--ff-font-body)",
                  fontSize: "var(--ff-type-body-md)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "var(--ff-space-3) var(--ff-space-5)",
                  background: "var(--ff-text-primary)",
                  color: "var(--ff-paper)",
                  border: "none",
                  borderRadius: "var(--ff-radius-sharp)",
                  fontFamily: "var(--ff-font-body)",
                  fontSize: "var(--ff-type-body-md)",
                  fontWeight: "var(--ff-weight-medium)" as unknown as number,
                  cursor: "pointer",
                }}
              >
                {submitLabel}
              </button>
            </form>
            {fineprint && (
              <Body size="sm" tone="tertiary">
                {fineprint}
              </Body>
            )}
          </Stack>
        </Reveal>
      </Frame>
    </Exhibit>
  );
}
