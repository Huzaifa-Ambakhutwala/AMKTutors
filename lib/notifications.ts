/**
 * Centralized notification utilities. Use these instead of alert() for consistent UX.
 * Renders via Sonner Toaster in root layout. In client components, import { toast } from "sonner".
 */
export type ToastType = "success" | "error" | "info" | "warning" | "message";
