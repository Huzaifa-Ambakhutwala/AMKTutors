"use client";

import { firestoreErrorMessage } from "@/lib/firestore-safe";
import { AlertCircle, RotateCcw } from "lucide-react";

type Props = {
  error: unknown;
  onRetry?: () => void;
};

export default function FirestoreErrorBanner({ error, onRetry }: Props) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
      <AlertCircle className="shrink-0 mt-0.5" size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{firestoreErrorMessage(error)}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:text-red-900"
          >
            <RotateCcw size={14} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
