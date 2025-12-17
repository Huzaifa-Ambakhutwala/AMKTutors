"use client";

/**
 * Theme motion utilities
 * Ensures motion animations work with theme colors without causing re-renders
 */

export const themeColors = {
  primary: "#1A2742",
  secondary: "#800000",
  accent: "#2A3F5F",
};

/**
 * Get CSS variable value for theme color
 */
export function getThemeColor(color: "primary" | "secondary" | "accent"): string {
  if (typeof window === "undefined") return themeColors[color];
  
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(`--theme-${color}`);
  
  return value.trim() || themeColors[color];
}

/**
 * Apply theme color to motion component
 */
export function withThemeColor(
  color: "primary" | "secondary" | "accent"
): string {
  return `var(--theme-${color}, ${themeColors[color]})`;
}

