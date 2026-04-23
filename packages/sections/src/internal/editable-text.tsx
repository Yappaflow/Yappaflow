"use client";

import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { SectionEditContext } from "./edit-context.js";

export interface EditableTextProps {
  /** Current text value rendered when not actively editing. */
  value: string;
  /** Dot-path field inside the section's content this node edits. */
  field: string;
  /** Rendered HTML tag. Keep semantic — h1/h2/p/span etc. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** If true, allow Enter to insert a newline (for paragraph/body text). */
  multiline?: boolean;
  /** Rendered when value is empty — shown as ghost text. */
  placeholder?: string;
}

/**
 * Click-to-edit text primitive for section render components.
 *
 * Behavior:
 *   - By default, renders a non-editable element with the given text.
 *   - Hovering shows a faint outline (only when inside an edit context).
 *   - Double-click switches to contentEditable, selects all.
 *   - Enter (without Shift, unless `multiline`) or blur commits the new text
 *     via the edit context's `onEdit(field, value)` hook.
 *   - Escape cancels — reverts the DOM text to the incoming `value`.
 *
 * Outside an edit context (e.g., CMS export, marketing embedding), this is
 * a plain rendered element with no interactivity — the `onEdit` hook is
 * gated on the context existing.
 */
export const EditableText = forwardRef<HTMLElement, EditableTextProps>(
  function EditableText(
    { value, field, as: Tag = "span", className, style, multiline, placeholder },
    externalRef,
  ) {
    const ctx = useContext(SectionEditContext);
    const ref = useRef<HTMLElement | null>(null);
    const [editing, setEditing] = useState(false);

    // Keep the DOM text in sync with `value` when NOT editing. While the
    // user is typing, we deliberately don't touch the DOM — React's
    // reconciler would otherwise clobber their keystrokes.
    useEffect(() => {
      if (!ref.current || editing) return;
      if (ref.current.textContent !== value) {
        ref.current.textContent = value || "";
      }
    }, [value, editing]);

    function setRef(node: HTMLElement | null) {
      ref.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) externalRef.current = node;
    }

    // Read-only path — no context, no interactivity.
    if (!ctx) {
      return (
        <Tag className={className} style={style}>
          {value || placeholder || ""}
        </Tag>
      );
    }

    function startEdit(event: MouseEvent<HTMLElement>) {
      event.stopPropagation();
      setEditing(true);
      queueMicrotask(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        // Select all content for quick replacement.
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    }

    function commit() {
      if (!editing || !ctx) return;
      const next = (ref.current?.textContent ?? "").replace(/\u00a0/g, " ");
      setEditing(false);
      // Only fire onEdit when the text actually changed — avoids noisy
      // autosaves when the user just clicked out without changing anything.
      if (next !== value) ctx.onEdit(field, next);
    }

    function cancel() {
      setEditing(false);
      if (ref.current) ref.current.textContent = value;
    }

    function handleKey(event: KeyboardEvent<HTMLElement>) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        ref.current?.blur();
        return;
      }
      if (event.key === "Enter" && !(multiline && event.shiftKey)) {
        event.preventDefault();
        ref.current?.blur();
      }
    }

    const mergedClassName = [
      className,
      "yf-editable",
      editing ? "yf-editable-active" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Tag
        ref={setRef as never}
        className={mergedClassName}
        style={style}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing}
        data-yf-field={field}
        onDoubleClick={startEdit}
        onBlur={commit}
        onKeyDown={handleKey}
      />
    );
  },
);
