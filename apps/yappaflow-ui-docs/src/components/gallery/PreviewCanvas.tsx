import { type ReactNode } from "react";

/**
 * <PreviewCanvas> — neutral padded stage for gallery previews.
 *
 * Isolates the component preview from the surrounding docs chrome with
 * consistent padding and a subtle grid backdrop that reads regardless of
 * light/dark theme.
 */
export function PreviewCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="preview-canvas">
      <div className="preview-canvas__grid" aria-hidden="true" />
      <div className="preview-canvas__stage">{children}</div>
    </div>
  );
}
