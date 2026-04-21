"use client";

import { useState, type ReactNode } from "react";

interface LiveExampleProps {
  /** Label shown above the preview — e.g. "ThemeToggle, framed variant". */
  title?: string;
  /** The actual React node that mounts inside the preview canvas. */
  children: ReactNode;
  /** Source code to show in the "Code" tab — raw string; not rendered as MDX. */
  code: string;
  /** Language hint for the code block — defaults to tsx. */
  language?: string;
  /** Start on the code tab instead of the preview. */
  defaultTab?: "preview" | "code";
}

/**
 * <LiveExample> — inline, interactive example in a docs MDX page.
 *
 * Renders the actual component (so readers can click/drag/hover it), with a
 * tab toggle to reveal the underlying code. Includes a "Copy" affordance.
 *
 * Authors hand-write both the `children` (the rendered component tree) and
 * the `code` string (what shows in the Code tab). Keeping them separate
 * avoids running a source-extraction step at build time and means the code
 * shown can be simplified/trimmed for readability.
 */
export function LiveExample({
  title,
  children,
  code,
  language = "tsx",
  defaultTab = "preview",
}: LiveExampleProps) {
  const [tab, setTab] = useState<"preview" | "code">(defaultTab);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available — no-op */
    }
  };

  return (
    <figure className="live-example">
      <header className="live-example__header">
        <span className="live-example__title">{title ?? "Example"}</span>
        <div className="live-example__tabs" role="tablist" aria-label="Preview or code">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            onClick={() => setTab("preview")}
            className="live-example__tab"
            data-active={tab === "preview"}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "code"}
            onClick={() => setTab("code")}
            className="live-example__tab"
            data-active={tab === "code"}
          >
            Code
          </button>
        </div>
      </header>

      {tab === "preview" ? (
        <div className="live-example__preview" role="tabpanel">
          {children}
        </div>
      ) : (
        <div className="live-example__code-wrap" role="tabpanel">
          <button
            type="button"
            onClick={copy}
            className="live-example__copy"
            aria-label={copied ? "Copied" : "Copy code to clipboard"}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <pre className={`language-${language}`}><code>{code}</code></pre>
        </div>
      )}

      <style>{EXAMPLE_CSS}</style>
    </figure>
  );
}

const EXAMPLE_CSS = /* css */ `
.live-example {
  margin: var(--ff-space-5) 0;
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface-raised);
  overflow: hidden;
}
.live-example__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ff-space-3);
  padding: var(--ff-space-3) var(--ff-space-4);
  border-bottom: 1px solid var(--ff-border);
  background: var(--ff-surface);
}
.live-example__title {
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-eyebrow);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ff-text-tertiary);
  font-weight: 500;
}
.live-example__tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--ff-border);
  border-radius: 9999px;
  background: var(--ff-surface-raised);
}
.live-example__tab {
  background: transparent;
  border: 0;
  padding: 0.3rem 0.8rem;
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-text-secondary);
  cursor: pointer;
  border-radius: 9999px;
  transition: background 200ms cubic-bezier(0.25, 1, 0.5, 1),
              color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.live-example__tab[data-active="true"] {
  background: var(--ff-text-primary);
  color: var(--ff-paper);
}
.live-example__preview {
  padding: var(--ff-space-6);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  background:
    linear-gradient(to right, var(--ff-border) 1px, transparent 1px) 0 0 / 48px 48px,
    linear-gradient(to bottom, var(--ff-border) 1px, transparent 1px) 0 0 / 48px 48px,
    var(--ff-surface-raised);
  background-blend-mode: multiply;
}
.live-example__code-wrap {
  position: relative;
}
.live-example__code-wrap pre {
  margin: 0;
  padding: var(--ff-space-5);
  font-family: var(--ff-font-mono);
  font-size: var(--ff-type-body-sm);
  line-height: 1.6;
  background: var(--ff-surface);
  color: var(--ff-text-primary);
  overflow-x: auto;
}
.live-example__copy {
  position: absolute;
  top: var(--ff-space-3);
  right: var(--ff-space-3);
  background: var(--ff-surface-raised);
  border: 1px solid var(--ff-border);
  color: var(--ff-text-secondary);
  padding: 0.3rem 0.7rem;
  border-radius: var(--ff-radius-sharp);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  cursor: pointer;
  transition: border-color 200ms cubic-bezier(0.25, 1, 0.5, 1),
              color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.live-example__copy:hover {
  border-color: var(--ff-text-primary);
  color: var(--ff-text-primary);
}
`;
