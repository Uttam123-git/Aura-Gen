/**
 * AuraGen Design System Tokens
 *
 * Centralized design values for AI-generated React interfaces.
 * All generated components should follow these values to maintain
 * visual consistency and accessibility.
 */

export const colors = Object.freeze({
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryForeground: "#FFFFFF",

  secondary: "#475569",
  secondaryForeground: "#FFFFFF",

  background: "#FFFFFF",
  surface: "#F8FAFC",
  foreground: "#0F172A",
  mutedForeground: "#475569",

  border: "#CBD5E1",
  focus: "#2563EB",

  success: "#166534",
  successBackground: "#F0FDF4",

  warning: "#92400E",
  warningBackground: "#FFFBEB",

  danger: "#B91C1C",
  dangerBackground: "#FEF2F2",
});

export const typography = Object.freeze({
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  fontSize: Object.freeze({
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  }),

  fontWeight: Object.freeze({
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  }),

  lineHeight: Object.freeze({
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  }),
});

export const spacing = Object.freeze({
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
});

export const radius = Object.freeze({
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
});

export const focusRing = Object.freeze({
  color: colors.focus,
  width: "2px",
  offset: "2px",
  style: "solid",
});

export const designTokens = Object.freeze({
  colors,
  typography,
  spacing,
  radius,
  focusRing,
});

export default designTokens;
