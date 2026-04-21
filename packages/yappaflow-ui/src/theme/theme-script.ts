/**
 * Pre-paint theme resolution script.
 *
 * This string is inlined into the <head> by ThemeProvider (or manually by
 * the AI-generated sites). It runs before first paint and sets
 * data-theme on <html> so there's no flash of wrong theme.
 *
 * Resolution order:
 *   1. localStorage("ff-theme") → "light" | "dark"
 *   2. If "auto": read prefers-color-scheme, leave data-theme="auto"
 *      (the CSS media query handles it).
 *   3. Default: "light" per Yappaflow standing rule.
 */
export const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem("ff-theme");
    var theme = stored === "dark" || stored === "light" ? stored : "auto";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`.trim();
