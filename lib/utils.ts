import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Converts undefined or empty strings to null.
 * Use this for optional Firestore fields to prevent "Unsupported field value: undefined" errors.
 * 
 * @param value The input string (or undefined/null)
 * @returns The trimmed string, or null if empty/undefined
 */
export function normalizeOptionalString(value: string | undefined | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function getInviteLink(token: string): string {
    if (typeof window === 'undefined') return "";
    return `${window.location.origin}/invite/${token}`;
}
