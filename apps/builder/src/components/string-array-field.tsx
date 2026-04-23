"use client";

import { useState } from "react";

/**
 * Dedicated editor for `string[]` section content (e.g. logo-cloud labels).
 * Each row is a single <input>; add/remove/reorder with +/- buttons.
 *
 * Kept separate from the generic ArrayField because the flat-string case is
 * common enough to deserve a compact UI — no collapse/expand, no columns
 * config, one line per value.
 */
export function StringArrayField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  // Track which item the user just added so we can autofocus it. Ephemeral.
  const [newlyAdded, setNewlyAdded] = useState<number | null>(null);

  function setAt(index: number, next: string) {
    const copy = [...value];
    copy[index] = next;
    onChange(copy);
  }

  function addItem() {
    const copy = [...value, ""];
    onChange(copy);
    setNewlyAdded(copy.length - 1);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const copy = [...value];
    const [moved] = copy.splice(index, 1);
    if (moved === undefined) return;
    copy.splice(target, 0, moved);
    onChange(copy);
  }

  return (
    <fieldset className="mb-4 rounded border border-current/10">
      <legend className="mx-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
        {label}
      </legend>
      <ul className="divide-y divide-current/10">
        {value.map((item, i) => (
          <li key={i} className="flex items-center gap-1 px-3 py-1.5">
            <span className="w-5 font-mono text-[10px] opacity-40">
              {(i + 1).toString().padStart(2, "0")}
            </span>
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              autoFocus={newlyAdded === i}
              onChange={(e) => setAt(i, e.target.value)}
              className="flex-1 rounded border border-current/15 bg-transparent px-2 py-1 text-sm focus:border-current/50 focus:outline-none"
            />
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
          </li>
        ))}
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
