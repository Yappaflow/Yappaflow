import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface ContactDetailRow {
  /** Small uppercase label, e.g. "STUDIO", "HOURS", "EMAIL". */
  label: string;
  /** Main line under the label. */
  value: string;
  /** Optional href — if set, wraps `value` in an anchor. */
  href?: string;
}

export interface ExhibitContactProps {
  eyebrow?:    string;
  heading:     string;
  subheading?: string;
  rows:        ContactDetailRow[];
  /** When true, shows a working message form next to the details. */
  includeForm?: boolean;
  /** Form action URL. Leave empty — agency wires it post-deploy. */
  formAction?:  string;
  id?:         string;
  className?:  string;
}

/**
 * <ExhibitContact> — editorial contact exhibit.
 *
 * Left column: a detail list (address, hours, email, phone …). Right
 * column: optional contact form. No Google Maps embed — that's a heavy
 * client-only widget that doesn't static-export cleanly. If the identity
 * asks for a map vibe, pair this exhibit with an `<ExhibitSplit>` below,
 * passing a `mediaSlot` with a stylised SVG map.
 */
export function ExhibitContact({
  eyebrow,
  heading,
  subheading,
  rows,
  includeForm = true,
  formAction = "",
  id,
  className,
}: ExhibitContactProps) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: includeForm ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr",
    gap: "var(--ff-space-7)",
    alignItems: "start",
  };

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-contact", className)}>
      <Frame span={12} offset="center">
        <Stack rhythm="room">
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
            </Stack>
          </Reveal>

          <div style={gridStyle}>
            <Reveal beat="primary" variant="fade-translate" trigger="in-view">
              <Stack rhythm="breath" align="start">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--ff-space-2)",
                      paddingBottom: "var(--ff-space-4)",
                      borderBottom:
                        i === rows.length - 1 ? "none" : "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
                      width: "100%",
                    }}
                  >
                    <Eyebrow>{row.label}</Eyebrow>
                    {row.href ? (
                      <a
                        href={row.href}
                        style={{
                          fontFamily: "var(--ff-font-body)",
                          fontSize: "var(--ff-type-body-lg)",
                          color: "var(--ff-text-primary)",
                          textDecoration: "none",
                          lineHeight: "var(--ff-leading-body)",
                        }}
                      >
                        {row.value}
                      </a>
                    ) : (
                      <Body size="lg" tone="primary">
                        {row.value}
                      </Body>
                    )}
                  </div>
                ))}
              </Stack>
            </Reveal>

            {includeForm && (
              <Reveal beat="primary" variant="fade-translate" trigger="in-view">
                <form
                  method="post"
                  action={formAction}
                  data-form-action={formAction}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--ff-space-3)",
                  }}
                >
                  <ContactField id="contact-name" label="Name" type="text" required />
                  <ContactField id="contact-email" label="Email" type="email" required />
                  <ContactField id="contact-message" label="Message" multiline required />
                  <button
                    type="submit"
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "var(--ff-space-2)",
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
                    Send message
                  </button>
                </form>
              </Reveal>
            )}
          </div>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function ContactField({
  id,
  label,
  type = "text",
  multiline = false,
  required = false,
}: {
  id: string;
  label: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const inputStyle: CSSProperties = {
    padding: "var(--ff-space-3) var(--ff-space-4)",
    background: "transparent",
    color: "var(--ff-text-primary)",
    border: "1px solid var(--ff-text-primary)",
    borderRadius: "var(--ff-radius-sharp)",
    fontFamily: "var(--ff-font-body)",
    fontSize: "var(--ff-type-body-md)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ff-space-2)" }}>
      <label htmlFor={id}>
        <Eyebrow>{label}</Eyebrow>
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={id.replace("contact-", "")}
          required={required}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
        />
      ) : (
        <input
          id={id}
          name={id.replace("contact-", "")}
          type={type}
          required={required}
          style={inputStyle}
        />
      )}
    </div>
  );
}
