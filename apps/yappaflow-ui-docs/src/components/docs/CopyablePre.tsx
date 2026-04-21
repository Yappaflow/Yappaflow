"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";

/**
 * <CopyablePre> — a drop-in replacement for MDX's <pre> that adds a copy
 * button in the top-right corner. rehype-pretty-code emits syntax-highlighted
 * <pre> blocks; we wrap them without touching the highlighting pipeline.
 *
 * The button reads the actual rendered text via a ref on mount instead of
 * taking `code` as a prop, so authors don't need to duplicate content.
 */
export function CopyablePre(props: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable — just no-op */
    }
  };

  return (
    <div className="copyable-pre">
      <button
        type="button"
        className="copyable-pre__btn"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={ref} {...props} />
      <style>{CSS}</style>
    </div>
  );
}

const CSS = /* css */ `
.copyable-pre {
  position: relative;
}
.copyable-pre__btn {
  position: absolute;
  top: var(--ff-space-3);
  right: var(--ff-space-3);
  z-index: 1;
  background: var(--ff-surface-raised);
  border: 1px solid var(--ff-border);
  color: var(--ff-text-secondary);
  padding: 0.25rem 0.7rem;
  border-radius: var(--ff-radius-sharp);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  cursor: pointer;
  opacity: 0;
  transition: opacity 200ms cubic-bezier(0.25, 1, 0.5, 1),
              border-color 200ms cubic-bezier(0.25, 1, 0.5, 1),
              color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.copyable-pre:hover .copyable-pre__btn,
.copyable-pre__btn:focus-visible {
  opacity: 1;
}
.copyable-pre__btn:hover {
  border-color: var(--ff-text-primary);
  color: var(--ff-text-primary);
}
`;
