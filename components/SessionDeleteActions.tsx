"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@/lib/types";
import { deleteOneSession, deleteRecurringSeries } from "@/lib/session-delete";

type Props = {
  session: Session;
  onDeleted?: () => void;
  redirectTo?: string;
  className?: string;
  layout?: "row" | "stack";
};

export default function SessionDeleteActions({
  session,
  onDeleted,
  redirectTo = "/admin/sessions",
  className = "",
  layout = "row",
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<"single" | "series" | null>(null);
  const isRecurring = Boolean(session.recurringSeriesId);

  const handleDeleteSingle = async () => {
    if (
      !confirm(
        "Delete this session?\n\nThis will remove it from the schedule and Google Calendar. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting("single");
    try {
      await deleteOneSession(session);
      toast.success("Session deleted");
      onDeleted?.();
      router.push(redirectTo);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete session");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteSeries = async () => {
    if (!session.recurringSeriesId) return;
    if (
      !confirm(
        "Delete the entire recurring series?\n\nAll sessions created together from the same recurring schedule will be removed. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting("series");
    try {
      const count = await deleteRecurringSeries(session.recurringSeriesId);
      toast.success(`Deleted ${count} session${count === 1 ? "" : "s"} in series`);
      onDeleted?.();
      router.push(redirectTo);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete series");
    } finally {
      setDeleting(null);
    }
  };

  const busy = deleting !== null;
  const containerClass =
    layout === "stack"
      ? "flex flex-col gap-2"
      : "flex flex-wrap items-center gap-2";

  return (
    <div className={`${containerClass} ${className}`}>
      <button
        type="button"
        onClick={handleDeleteSingle}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-60 min-h-[44px]"
      >
        {deleting === "single" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
        Delete this session
      </button>
      {isRecurring && (
        <button
          type="button"
          onClick={handleDeleteSeries}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 border border-red-700 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60 min-h-[44px]"
        >
          {deleting === "series" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Repeat size={16} />
          )}
          Delete this series
        </button>
      )}
    </div>
  );
}
