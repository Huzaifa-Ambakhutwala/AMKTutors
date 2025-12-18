"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Save, Palette, RefreshCw } from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

interface ColorSettings {
    primary: string;
    secondary: string;
    accent: string;
    yellow: string;
    yellowDark: string;
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [colors, setColors] = useState<ColorSettings>({
        primary: "#1A2742",
        secondary: "#800000",
        accent: "#2A3F5F",
        yellow: "#FCD34D",
        yellowDark: "#F59E0B",
    });

    useEffect(() => {
        loadColors();
    }, []);

    const loadColors = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, "settings", "theme_colors"));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setColors({
                    primary: data.primary || "#1A2742",
                    secondary: data.secondary || "#800000",
                    accent: data.accent || "#2A3F5F",
                    yellow: data.yellow || "#FCD34D",
                    yellowDark: data.yellowDark || "#F59E0B",
                });
                // Apply colors immediately on load
                applyColorsToDOM({
                    primary: data.primary || "#1A2742",
                    secondary: data.secondary || "#800000",
                    accent: data.accent || "#2A3F5F",
                    yellow: data.yellow || "#FCD34D",
                    yellowDark: data.yellowDark || "#F59E0B",
                });
            } else {
                // Apply default colors
                applyColorsToDOM(colors);
            }
        } catch (error) {
            console.error("Error loading colors:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyColorsToDOM = (colorSettings: ColorSettings) => {
        if (typeof document === "undefined") return;
        
        const root = document.documentElement;
        root.style.setProperty("--theme-primary", colorSettings.primary);
        root.style.setProperty("--theme-secondary", colorSettings.secondary);
        root.style.setProperty("--theme-accent", colorSettings.accent);
        root.style.setProperty("--theme-yellow", colorSettings.yellow);
        root.style.setProperty("--theme-yellow-dark", colorSettings.yellowDark);
    };

    const handleColorChange = (key: keyof ColorSettings, value: string) => {
        const newColors = { ...colors, [key]: value };
        setColors(newColors);
        // Preview colors in real-time
        applyColorsToDOM(newColors);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "theme_colors"), colors, { merge: true });
            alert("Colors saved successfully! The changes are now live across the website.");
        } catch (error) {
            console.error("Error saving colors:", error);
            alert("Failed to save colors");
        } finally {
            setSaving(false);
        }
    };

    const getSystemDefaultColors = (): ColorSettings => ({
        primary: "#1A2742",
        secondary: "#800000",
        accent: "#2A3F5F",
        yellow: "#FCD34D",
        yellowDark: "#F59E0B",
    });

    const handleSetDefault = async () => {
        setSaving(true);
        try {
            // Save current colors as the default
            await setDoc(doc(db, "settings", "theme_colors_default"), colors, { merge: true });
            alert("Current colors have been saved as default! You can reset to these colors anytime.");
        } catch (error) {
            console.error("Error setting default colors:", error);
            alert("Failed to set default colors");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        try {
            // Try to load saved defaults first, otherwise use system defaults
            const docSnap = await getDoc(doc(db, "settings", "theme_colors_default"));
            let defaultColors: ColorSettings;
            
            if (docSnap.exists()) {
                // Use saved defaults
                defaultColors = docSnap.data() as ColorSettings;
            } else {
                // Use system defaults
                defaultColors = getSystemDefaultColors();
            }
            
            setColors(defaultColors);
            applyColorsToDOM(defaultColors);
            // Also save to current colors
            await setDoc(doc(db, "settings", "theme_colors"), defaultColors, { merge: true });
            alert("Colors reset to default!");
        } catch (error) {
            console.error("Error resetting colors:", error);
            // Fallback to system defaults
            const defaultColors = getSystemDefaultColors();
            setColors(defaultColors);
            applyColorsToDOM(defaultColors);
            alert("Colors reset to system defaults!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={['ADMIN']}>
                <div className="p-8 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-gray-600">Loading color settings...</p>
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-heading mb-2">Theme Colors</h1>
                    <p className="text-gray-600">Customize the color scheme for your website. Changes apply in real-time.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl">
                    <div className="space-y-6">
                        {/* Primary Color */}
                        <div className="flex items-center gap-6">
                            <div className="w-32">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                                <p className="text-xs text-gray-500">Main brand color (buttons, links, icons)</p>
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <input
                                    type="color"
                                    value={colors.primary}
                                    onChange={(e) => handleColorChange("primary", e.target.value)}
                                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={colors.primary}
                                    onChange={(e) => handleColorChange("primary", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="#1A2742"
                                />
                                <div
                                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                                    style={{ backgroundColor: colors.primary }}
                                />
                            </div>
                        </div>

                        {/* Secondary Color */}
                        <div className="flex items-center gap-6">
                            <div className="w-32">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Secondary Color</label>
                                <p className="text-xs text-gray-500">Section backgrounds, highlights</p>
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <input
                                    type="color"
                                    value={colors.secondary}
                                    onChange={(e) => handleColorChange("secondary", e.target.value)}
                                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={colors.secondary}
                                    onChange={(e) => handleColorChange("secondary", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="#800000"
                                />
                                <div
                                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                                    style={{ backgroundColor: colors.secondary }}
                                />
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div className="flex items-center gap-6">
                            <div className="w-32">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Accent Color</label>
                                <p className="text-xs text-gray-500">Hover states, secondary buttons</p>
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <input
                                    type="color"
                                    value={colors.accent}
                                    onChange={(e) => handleColorChange("accent", e.target.value)}
                                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={colors.accent}
                                    onChange={(e) => handleColorChange("accent", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="#2A3F5F"
                                />
                                <div
                                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                                    style={{ backgroundColor: colors.accent }}
                                />
                            </div>
                        </div>

                        {/* Yellow Color */}
                        <div className="flex items-center gap-6">
                            <div className="w-32">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Yellow Accent</label>
                                <p className="text-xs text-gray-500">Highlights, call-to-action elements</p>
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <input
                                    type="color"
                                    value={colors.yellow}
                                    onChange={(e) => handleColorChange("yellow", e.target.value)}
                                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={colors.yellow}
                                    onChange={(e) => handleColorChange("yellow", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="#FCD34D"
                                />
                                <div
                                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                                    style={{ backgroundColor: colors.yellow }}
                                />
                            </div>
                        </div>

                        {/* Yellow Dark */}
                        <div className="flex items-center gap-6">
                            <div className="w-32">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Yellow Dark</label>
                                <p className="text-xs text-gray-500">Hover states for yellow elements</p>
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <input
                                    type="color"
                                    value={colors.yellowDark}
                                    onChange={(e) => handleColorChange("yellowDark", e.target.value)}
                                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={colors.yellowDark}
                                    onChange={(e) => handleColorChange("yellowDark", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="#F59E0B"
                                />
                                <div
                                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                                    style={{ backgroundColor: colors.yellowDark }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className="p-6 rounded-xl text-white"
                                style={{ backgroundColor: colors.secondary }}
                            >
                                <h4 className="font-bold text-lg mb-2">Secondary Background</h4>
                                <p className="text-sm opacity-90">This is how sections with secondary color will look</p>
                                <button
                                    className="mt-4 px-4 py-2 rounded-lg font-semibold"
                                    style={{ backgroundColor: colors.yellow, color: colors.secondary }}
                                >
                                    Yellow Button
                                </button>
                            </div>
                            <div className="p-6 rounded-xl border-2 border-gray-200">
                                <h4 className="font-bold text-lg mb-2" style={{ color: colors.primary }}>Primary Text</h4>
                                <p className="text-sm text-gray-600">Regular content on white background</p>
                                <button
                                    className="mt-4 px-4 py-2 rounded-lg font-semibold text-white"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    Primary Button
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleSetDefault}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                            Set as Default
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReset}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw size={18} />
                                Reset to Default
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-accent disabled:opacity-50 transition-colors shadow-sm font-semibold"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Apply Colors
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

