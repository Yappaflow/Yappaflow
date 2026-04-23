"use client";

import { useState } from "react";

/**
 * Generic array-of-objects editor for section content fields. Works for:
 *   - feature-grid `features`
 *   - product-grid `products`
 *   - testimonial `items`
 *   - footer `columns`
 *   - cta-band secondaryCta, etc. (not strictly array, handled elsewhere)
 *
 * Callers pass `value` (the current array), `columns` (a description of each
 * item's shape so we know what input to render), and `onChange` to commit
 * updates. No nested arrays yet — each item's properties must be primitives
 * or simple objects; double-nested structures (footer columns → links) will
 * need a recursive variant, added when we need it.
 */

export interface ArrayFieldColumn {
  key: string;
  label?: string;
  kind?: "text" | "textarea" | "url" | "number";
  placeholder?: string;
  /** For nested single-level objects (e.g. product.image.url). */
  nestedKey?: string;
}

export function ArrayField({
  label,
  value,
  columns,
  makeBlankItem,
  onChange,
  itemLabel,
}: {
  label: string;
  value: Array<Record<string, unknown>>;
  columns: ArrayFieldColumn[];
  makeBlankItem: () => Record<string, unknown>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  /** Given an item, return a short display label for its row. */
  itemLabel?: (item: Record<string, unknown>, index: number) => string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    value.length > 0 ? 0 : null,
  );

  function setAt(index: number, next: Record<string, unknown>) {
    const copy = [...value];
    copy[index] = next;
    onChange(copy);
  }

  function addItem() {
    const copy = [...value, makeBlankItem()];
    onChange(copy);
    setOpenIndex(copy.length - 1);
  }

  function removeAt(index: number) {
    const copy = value.filter((_, i) => i !== index);
    onChange(copy);
    setOpenIndex(null);
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const copy = [...value];
    const [moved] = copy.splice(index, 1);
    if (!moved) return;
    copy.splice(target, 0, moved);
    onChange(copy);
    setOpenIndex(target);
  }

  return (
    <fieldset className="mb-4 rounded border border-current/10">
      <legend className="mx-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
        {label}
      </legend>
      <ul className="divide-y divide-current/10">
        {value.map((item, i) => {
          const open = openIndex === i;
          const rowLabel = itemLabel
            ? itemLabel(item, i)
            : (item.title as string) ||
              (item.author as string) ||
              (item.heading as string) ||
              `Item ${i + 1}`;
          return (
            <li key={i}>
              <div className="flex items-center gap-1 px-3 py-2">
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex flex-1 items-center gap-2 text-left text-sm"
                >
                  <span className="w-5 font-mono text-[10px] opacity-40">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate">{rowLabel}</span>
                  <span className="text-[10px] opacity-50">{open ? "▾" : "▸"}</span>
                </button>
                <MiniButton
                  label="Move up"
                  onClick={() => moveItem(i, "up")}
                  disabled={i === 0}
                >
                  ↑
                </MiniButton>
                <MiniButton
                  label="Move down"
                  onClick={() => moveItem(i, "down")}
                  disabled={i === value.length - 1}
                >
                  ↓
                </MiniButton>
                <MiniButton label="Remove" onClick={() => removeAt(i)}>
                  ×
                </MiniButton>
              </div>
              {open ? (
                <div className="space-y-2 border-t border-current/10 bg-current/[0.02] p-3">
                  {columns.map((col) => {
                    const raw = col.nestedKey
                      ? ((item[col.key] as Record<string, unknown> | undefined)?.[
                          col.nestedKey
                        ] as string | number | undefined)
                      : (item[col.key] as string | number | undefined);
                    const value = raw == null ? "" : String(raw);
                    return (
                      <label key={`${col.key}${col.nestedKey ?? ""}`} className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider opacity-50">
                          {col.label ?? `${col.key}${col.nestedKey ? "." + col.nestedKey : ""}`}
                        </span>
                        {col.kind === "textarea" ? (
                          <textarea
                            value={value}
                            placeholder={col.placeholder}
                            onChange={(e) => {
                              const next = cloneItem(item);
                              setNested(next, col, e.target.value);
                              setAt(i, next);
                            }}
                            rows={3}
                            className="rounded border border-current/20 bg-transparent px-2 py-1.5 text-sm focus:border-current/60 focus:outline-none"
                          />
                        ) : (
                          <input
                            type={col.kind === "number" ? "number" : "text"}
                            value={value}
                            placeholder={col.placeholder}
                            onChange={(e) => {
                              const next = cloneItem(item);
                              const val =
                                col.kind === "number"
                                  ? Number(e.target.value)
                                  : e.target.value;
                              setNested(next, col, val);
                              setAt(i, next);
                            }}
                            className="rounded border border-current/20 bg-transparent px-2 py-1.5 text-sm focus:border-current/60 focus:outline-none"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="p-2">
        <button
          onClick={addItem}
          className="w-full rounded border border-dashed border-current/25 py-1.5 text-xs opacity-70 transition hover:border-current/50 hover:opacity-100"
        >
          + Add item
        </button>
      </div>
    </fieldset>
  );
}

function cloneItem(item: Record<string, unknown>): Record<string, unknown> {
  // Shallow copy for top-level keys; clone one level deeper for nested
  // object fields the form may edit (e.g. product.image.url).
  const copy: Record<string, unknown> = { ...item };
  for (const [k, v] of Object.entries(copy)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      copy[k] = { ...(v as Record<string, unknown>) };
    }
  }
  return copy;
}

function setNested(
  target: Record<string, unknown>,
  col: ArrayFieldColumn,
  value: string | number,
): void {
  if (col.nestedKey) {
    const existing = (target[col.key] as Record<string, unknown>) ?? {};
    target[col.key] = { ...existing, [col.nestedKey]: value };
  } else {
    target[col.key] = value;
  }
}

function MiniButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-50 hover:bg-current/15 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
    >
      {children}
    </button>
  );
}
