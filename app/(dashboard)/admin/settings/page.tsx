"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, linkWithPopup, User } from "firebase/auth";
import { Loader2, Save, Palette, RefreshCw, ChevronRight, Link2, CheckCircle, Bell } from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import NotificationSettingsPanel from "@/components/NotificationSettingsPanel";

interface ColorSettings {
    primary: string;
    secondary: string;
    accent: string;
    yellow: string;
    yellowDark: string;
}

const COLOR_LABELS: { key: keyof ColorSettings; label: string; hint: string }[] = [
    { key: "primary", label: "Primary Color", hint: "Main brand color (buttons, links, icons)" },
    { key: "secondary", label: "Secondary Color", hint: "Section backgrounds, highlights" },
    { key: "accent", label: "Accent Color", hint: "Hover states, secondary buttons" },
    { key: "yellow", label: "Yellow Accent", hint: "Highlights, call-to-action elements" },
    { key: "yellowDark", label: "Yellow Dark", hint: "Hover states for yellow elements" },
];

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkSuccess, setLinkSuccess] = useState(false);
    const [colors, setColors] = useState<ColorSettings>({
        primary: "#1A2742",
        secondary: "#800000",
        accent: "#2A3F5F",
        yellow: "#FCD34D",
        yellowDark: "#F59E0B",
    });
    const isMobile = useIsMobile();

    useEffect(() => {
        loadColors();
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, setFirebaseUser);
        return () => unsub();
    }, []);

    const hasGoogleProvider = firebaseUser?.providerData?.some((p) => p?.providerId === "google.com") ?? false;

    const handleLinkGoogle = async () => {
        if (!auth.currentUser) return;
        setLinkLoading(true);
        setLinkError(null);
        setLinkSuccess(false);
        try {
            await linkWithPopup(auth.currentUser, googleProvider);
            setLinkSuccess(true);
        } catch (err: unknown) {
            const e = err as { code?: string; message?: string };
            if (e.code === "auth/credential-already-in-use") {
                setLinkError("This Google account is already linked to another user.");
            } else if (e.code === "auth/popup-closed-by-user") {
                setLinkError(null);
            } else {
                setLinkError(e.message ?? "Failed to link Google account.");
            }
        } finally {
            setLinkLoading(false);
        }
    };

    const loadColors = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, "settings", "theme_colors"));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const loaded = {
                    primary: data.primary || "#1A2742",
                    secondary: data.secondary || "#800000",
                    accent: data.accent || "#2A3F5F",
                    yellow: data.yellow || "#FCD34D",
                    yellowDark: data.yellowDark || "#F59E0B",
                };
                setColors(loaded);
                applyColorsToDOM(loaded);
            } else {
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
        applyColorsToDOM(newColors);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "theme_colors"), colors, { merge: true });
            toast.success("Colors saved successfully! The changes are now live across the website.");
        } catch (error) {
            console.error("Error saving colors:", error);
            toast.error("Failed to save colors");
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
            await setDoc(doc(db, "settings", "theme_colors_default"), colors, { merge: true });
            toast.success("Current colors have been saved as default! You can reset to these colors anytime.");
        } catch (error) {
            console.error("Error setting default colors:", error);
            toast.error("Failed to set default colors");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        try {
            const docSnap = await getDoc(doc(db, "settings", "theme_colors_default"));
            let defaultColors: ColorSettings = docSnap.exists() ? (docSnap.data() as ColorSettings) : getSystemDefaultColors();
            setColors(defaultColors);
            applyColorsToDOM(defaultColors);
            await setDoc(doc(db, "settings", "theme_colors"), defaultColors, { merge: true });
            toast.success("Colors reset to default!");
        } catch (error) {
            console.error("Error resetting colors:", error);
            const defaultColors = getSystemDefaultColors();
            setColors(defaultColors);
            applyColorsToDOM(defaultColors);
            toast.success("Colors reset to system defaults!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={['ADMIN']}>
                <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
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
            <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">Settings</h1>
                    <p className="text-gray-600">Account and theme options.</p>
                </div>

                {/* Account - Link Google */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Link2 className="text-primary" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                    </div>
                    <div className="p-4 md:p-6">
                        <p className="text-sm text-gray-600 mb-3">
                            Sign-in methods: {firebaseUser?.providerData?.map((p) => p?.providerId === "google.com" ? "Google" : "Email").filter(Boolean).join(", ") || "—"}
                        </p>
                        {hasGoogleProvider ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle size={18} />
                                <span>Google account linked. You can sign in with Google or email.</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 mb-3">
                                    Link your Google account to sign in with Google in the future.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleLinkGoogle}
                                    disabled={linkLoading}
                                    className="flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {linkLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                                    Link Google to my account
                                </button>
                                {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
                                {linkSuccess && <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircle size={16} /> Google linked successfully.</p>}
                            </>
                        )}
                    </div>
                </section>

                {/* Notifications */}
                <div className="mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Bell className="text-primary" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Admin notifications</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                        Control how this admin account receives alerts.
                    </p>
                    <NotificationSettingsPanel />
                </div>

                {/* Theme section - grouped card */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Palette className="text-primary" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Theme colors</h2>
                    </div>
                    <div className="p-4 md:p-6 space-y-6">
                        {COLOR_LABELS.map(({ key, label, hint }) => (
                            <div
                                key={key}
                                className={`flex flex-col gap-3 min-h-[48px] ${!isMobile ? "md:flex-row md:items-center md:gap-6" : ""}`}
                            >
                                <div className={isMobile ? "w-full" : "md:w-40 shrink-0"}>
                                    <label className="block text-sm font-semibold text-gray-700">{label}</label>
                                    <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
                                </div>
                                <div className={`flex items-center gap-3 flex-1 ${isMobile ? "flex-col items-stretch" : ""}`}>
                                    <input
                                        type="color"
                                        value={colors[key]}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className={`rounded-lg border-2 border-gray-300 cursor-pointer ${isMobile ? "w-full h-12 min-h-[48px]" : "w-20 h-20"}`}
                                    />
                                    <input
                                        type="text"
                                        value={colors[key]}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm min-h-[48px] ${isMobile ? "w-full" : ""}`}
                                        placeholder="#hex"
                                    />
                                    {!isMobile && (
                                        <div
                                            className="w-16 h-16 rounded-lg border-2 border-gray-200 shrink-0"
                                            style={{ backgroundColor: colors[key] }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Preview - single column on mobile */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            className="p-6 rounded-xl text-white"
                            style={{ backgroundColor: colors.secondary }}
                        >
                            <h4 className="font-bold text-lg mb-2">Secondary Background</h4>
                            <p className="text-sm opacity-90">Sections with secondary color</p>
                            <button
                                className="mt-4 px-4 py-3 rounded-lg font-semibold min-h-[48px]"
                                style={{ backgroundColor: colors.yellow, color: colors.secondary }}
                            >
                                Yellow Button
                            </button>
                        </div>
                        <div className="p-6 rounded-xl border-2 border-gray-200">
                            <h4 className="font-bold text-lg mb-2" style={{ color: colors.primary }}>Primary Text</h4>
                            <p className="text-sm text-gray-600">Content on white</p>
                            <button
                                className="mt-4 px-4 py-3 rounded-lg font-semibold text-white min-h-[48px]"
                                style={{ backgroundColor: colors.primary }}
                            >
                                Primary Button
                            </button>
                        </div>
                    </div>
                </section>

                {/* Actions - grouped card, full-width rows on mobile */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <button
                            type="button"
                            onClick={handleSetDefault}
                            disabled={saving}
                            className="w-full flex items-center justify-between min-h-[48px] px-4 md:px-6 py-3 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                Set as Default
                            </span>
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={saving}
                            className="w-full flex items-center justify-between min-h-[48px] px-4 md:px-6 py-3 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <RefreshCw size={18} />
                                Reset to Default
                            </span>
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 min-h-[52px] px-4 md:px-6 py-3 bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Apply Colors
                        </button>
                    </div>
                </section>
            </div>
        </RoleGuard>
    );
}
