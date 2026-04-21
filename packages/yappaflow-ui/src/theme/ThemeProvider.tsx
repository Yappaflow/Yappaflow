"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isBrowser } from "../utils/ssr.js";

export type ThemeMode = "light" | "dark" | "auto";
/** Resolved theme — what the user is actually seeing. */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** User-selected mode (may be "auto"). */
  mode: ThemeMode;
  /** The currently-applied theme. Follows system when mode = auto. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "ff-theme";

const readStoredMode = (): ThemeMode => {
  if (!isBrowser) return "auto";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "auto") return value;
  } catch {
    /* ignore — private mode, etc. */
  }
  return "auto";
};

const systemPrefersDark = (): boolean => {
  if (!isBrowser) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const resolve = (mode: ThemeMode): ResolvedTheme => {
  if (mode === "light" || mode === "dark") return mode;
  return systemPrefersDark() ? "dark" : "light";
};

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Initial mode. `"light"` is the library default per the Yappaflow standing
   * rule (light by default, dark as opt-in toggle). Pass `"auto"` to follow
   * the user's system preference via matchMedia.
   */
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = "light" }: ThemeProviderProps) {
  // Initial state MUST be identical on server and client to avoid an RSC
  // hydration mismatch. We intentionally do not read localStorage or system
  // preference in the useState initializer — those run in the useEffect below,
  // after hydration, and only then bump state toward the user's real choice.
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    defaultMode === "dark" ? "dark" : "light",
  );

  // Post-hydration: reconcile with the stored preference (if any).
  useEffect(() => {
    const stored = readStoredMode();
    if (stored && stored !== mode) {
      setModeState(stored);
    }
    // Only run once on mount. Subsequent changes to `mode` are driven by
    // setMode/toggle, not by re-reading storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply to <html data-theme> whenever mode changes. Writing the resolved
  // value (not the literal mode) keeps the CSS simple — no :root[data-theme="auto"]
  // branches — and guarantees the palette always matches what React renders.
  useEffect(() => {
    if (!isBrowser) return;
    const next = resolve(mode);
    setResolved(next);
    document.documentElement.setAttribute("data-theme", next);
  }, [mode]);

  // Watch system preference when in auto mode.
  useEffect(() => {
    if (!isBrowser || mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (): void => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolved(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    handler();
    mq.addEventListener("change", handler);
    return (): void => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (isBrowser) {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const current = resolve(prev);
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      if (isBrowser) {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme must be used inside <ThemeProvider> (rendered by <GalleryShell>).",
    );
  }
  return ctx;
}
