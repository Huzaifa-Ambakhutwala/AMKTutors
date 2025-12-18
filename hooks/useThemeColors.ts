"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    yellow: string;
    yellowDark: string;
}

const defaultColors: ThemeColors = {
    primary: "#1A2742",
    secondary: "#800000",
    accent: "#2A3F5F",
    yellow: "#FCD34D",
    yellowDark: "#F59E0B",
};

const LOCAL_STORAGE_KEY = "amk-theme-colors";

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

        // Try to hydrate from localStorage immediately to avoid color flash
        if (typeof window !== "undefined") {
            try {
                const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as ThemeColors;
                    setColors(parsed);
                    applyColors(parsed);
                } else {
                    // Fallback to defaults on first load
                    applyColors(defaultColors);
                }
            } catch (e) {
                console.error("Error reading theme colors from localStorage:", e);
                applyColors(defaultColors);
            }
        } else {
            // Non-browser environments just use defaults
            applyColors(defaultColors);
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

