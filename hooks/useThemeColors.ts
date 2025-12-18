"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_THEME_COLORS, LOCAL_STORAGE_KEY } from "@/lib/theme-constants";

interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    yellow: string;
    yellowDark: string;
}

const defaultColors: ThemeColors = DEFAULT_THEME_COLORS;

export function useThemeColors() {
    const [colors, setColors] = useState<ThemeColors>(defaultColors);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Apply colors to DOM
        const applyColors = (colorSettings: ThemeColors) => {
            if (typeof document === "undefined") return;

            const root = document.documentElement;
            root.style.setProperty("--theme-primary", colorSettings.primary);
            root.style.setProperty("--theme-secondary", colorSettings.secondary);
            root.style.setProperty("--theme-accent", colorSettings.accent);
            root.style.setProperty("--theme-yellow", colorSettings.yellow);
            root.style.setProperty("--theme-yellow-dark", colorSettings.yellowDark);
        };

        // Colors are already applied by the pre-hydration script in layout.tsx
        // This hook just syncs with Firestore and updates localStorage for future loads
        // We still read from localStorage here to sync the state, but colors are already set
        if (typeof window !== "undefined") {
            try {
                const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as ThemeColors;
                    setColors(parsed);
                    // Colors should already be applied by the pre-hydration script,
                    // but apply again to ensure sync (this should be a no-op if already set)
                    applyColors(parsed);
                } else {
                    // Use defaults - pre-hydration script already applied them
                    setColors(defaultColors);
                }
            } catch (e) {
                console.error("Error reading theme colors from localStorage:", e);
                setColors(defaultColors);
            }
        } else {
            // Non-browser environments just use defaults
            setColors(defaultColors);
        }

        // Load from Firestore and subscribe for live updates
        const loadColors = async () => {
            try {
                const docSnap = await getDoc(doc(db, "settings", "theme_colors"));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const loadedColors: ThemeColors = {
                        primary: data.primary || defaultColors.primary,
                        secondary: data.secondary || defaultColors.secondary,
                        accent: data.accent || defaultColors.accent,
                        yellow: data.yellow || defaultColors.yellow,
                        yellowDark: data.yellowDark || defaultColors.yellowDark,
                    };
                    setColors(loadedColors);
                    applyColors(loadedColors);
                    if (typeof window !== "undefined") {
                        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedColors));
                    }
                }
            } catch (error) {
                console.error("Error loading theme colors:", error);
            } finally {
                setLoading(false);
            }
        };

        loadColors();

        // Listen for real-time updates
        const unsubscribe = onSnapshot(
            doc(db, "settings", "theme_colors"),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const updatedColors: ThemeColors = {
                        primary: data.primary || defaultColors.primary,
                        secondary: data.secondary || defaultColors.secondary,
                        accent: data.accent || defaultColors.accent,
                        yellow: data.yellow || defaultColors.yellow,
                        yellowDark: data.yellowDark || defaultColors.yellowDark,
                    };
                    setColors(updatedColors);
                    applyColors(updatedColors);
                    if (typeof window !== "undefined") {
                        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedColors));
                    }
                }
            },
            (error) => {
                console.error("Error listening to theme colors:", error);
            }
        );

        return () => unsubscribe();
    }, []);

    return { colors, loading };
}

