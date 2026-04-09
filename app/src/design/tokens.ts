export const Colors = {
  // Backgrounds
  bg:       "#0A0A0B",
  surface:  "#141415",
  surface2: "#1E1E20",
  surface3: "#252528",

  // Borders
  border:   "#2A2A2D",
  border2:  "#3A3A3E",

  // Brand
  accent:      "#F97316",
  accentDim:   "rgba(249,115,22,0.15)",
  accentBorder:"rgba(249,115,22,0.35)",

  // Status
  live:    "#22C55E",
  liveDim: "rgba(34,197,94,0.15)",
  warn:    "#F59E0B",
  warnDim: "rgba(245,158,11,0.15)",
  info:    "#3B82F6",
  infoDim: "rgba(59,130,246,0.15)",
  error:   "#EF4444",

  // Text
  textPrimary:   "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted:     "#52525B",

  // Platform tints
  whatsapp:  "#25D366",
  instagram: "#E1306C",
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

export const Space = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  "3xl": 40,
} as const;

export const Font = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  "3xl":38,
} as const;
