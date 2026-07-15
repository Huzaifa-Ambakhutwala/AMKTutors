"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_THEME_COLORS, LOCAL_STORAGE_KEY } from "@/lib/theme-constants";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  yellow: string;
  yellowDark: string;
}

const defaultColors: ThemeColors = DEFAULT_THEME_COLORS;

async function fetchThemeColors(): Promise<ThemeColors> {
  const docSnap = await safeFirestore(() => getDoc(doc(db, "settings", "theme_colors")));
  if (!docSnap.exists()) return defaultColors;
  wrapFirestoreResult(docSnap, 1);
  const data = docSnap.data();
  return {
    primary: data.primary || defaultColors.primary,
    secondary: data.secondary || defaultColors.secondary,
    accent: data.accent || defaultColors.accent,
    yellow: data.yellow || defaultColors.yellow,
    yellowDark: data.yellowDark || defaultColors.yellowDark,
  };
}

function applyColors(colorSettings: ThemeColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", colorSettings.primary);
  root.style.setProperty("--theme-secondary", colorSettings.secondary);
  root.style.setProperty("--theme-accent", colorSettings.accent);
  root.style.setProperty("--theme-yellow", colorSettings.yellow);
  root.style.setProperty("--theme-yellow-dark", colorSettings.yellowDark);
}

export function useThemeColors() {
  const { data: colors = defaultColors, isLoading } = useQuery({
    queryKey: ["theme", "colors"],
    queryFn: async () => {
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as ThemeColors;
            applyColors(parsed);
          }
        } catch {
          // ignore
        }
      }
      const loaded = await fetchThemeColors();
      applyColors(loaded);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loaded));
      }
      return loaded;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });

  return { colors, loading: isLoading };
}
