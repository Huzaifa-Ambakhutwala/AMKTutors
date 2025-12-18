"use client";

import { useThemeColors } from "@/hooks/useThemeColors";
import { useEffect } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { colors } = useThemeColors();

    // Colors are applied via CSS variables in the hook
    // This component just ensures the hook runs
    return <>{children}</>;
}

