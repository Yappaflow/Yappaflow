"use client";

import { useState, type CSSProperties } from "react";

export interface CodeSurfaceProps {
  /** Code text to render. Line breaks preserved. */
  code: string;
  /** Language label shown in the top-right corner. */
  language?: string;
  /** Optional caption below the block. */
  caption?: string;
  /** Layout variant. Default `raised`. */
  variant?: "raised" | "flush";
  style?: CSSProperties;
}

/**
 * <CodeSurface> — small code block used on the landing page for snippets.
 *
 * The written docs route uses rehype-pretty-code (Shiki) on MDX content for
 * syntax highlighting; this component is plain monospace on purpose so the
 * landing stays visually consistent with the library's restrained palette
 * and doesn't pull in a highlighter for one-off hero snippets.
 */
export function CodeSurface({
  code,
  language,
  caption,
  variant = "raised",
  style,
}: CodeSurfaceProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore — permissions, private mode, etc. */
    }
  };

  return (
    <figure className={`code-surface code-surface--${variant}`} style={style}>
      <div className="code-surface__head">
        {language && <span className="code-surface__lang">{language}</span>}
        <button
          type="button"
          className="code-surface__copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-surface__pre">
        <code>{code}</code>
      </pre>
      {caption && <figcaption className="code-surface__caption">{caption}</figcaption>}
      <style>{CODE_CSS}</style>
    </figure>
  );
}

const CODE_CSS = /* css */ `
.code-surface {
  margin: 0;
  border: 1px solid var(--ff-border);
  background: var(--ff-surface);
  border-radius: var(--ff-radius-sharp);
  overflow: hidden;
}
.code-surface--flush {
  border-left: 0;
  border-right: 0;
  border-radius: 0;
}
.code-surface__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ff-space-3) var(--ff-space-5);
  border-bottom: 1px solid var(--ff-border);
  font-family: var(--ff-font-body);
}
.code-surface__lang {
  font-size: var(--ff-type-body-xs, 0.78rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ff-text-tertiary);
}
.code-surface__copy {
  background: transparent;
  border: 0;
  color: var(--ff-text-secondary);
  font-size: var(--ff-type-body-sm);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  transition: color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.code-surface__copy:hover {
  color: var(--ff-text-primary);
}
.code-surface__pre {
  margin: 0;
  padding: var(--ff-space-5);
  overflow-x: auto;
  font-family: var(--ff-font-mono, ui-monospace, monospace);
  font-size: var(--ff-type-body-sm);
  line-height: 1.6;
  color: var(--ff-text-primary);
  white-space: pre;
}
.code-surface__caption {
  padding: var(--ff-space-3) var(--ff-space-5);
  border-top: 1px solid var(--ff-border);
  color: var(--ff-text-tertiary);
  font-size: var(--ff-type-body-sm);
}
`;
