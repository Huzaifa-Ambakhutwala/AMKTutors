/**
 * Client-side helper to trigger Google Calendar sync for a session.
 * Fire-and-forget: does not block the main flow; logs errors.
 */
export async function syncSessionToCalendar(
  sessionId: string,
  action: "create" | "update" | "delete"
): Promise<void> {
  try {
    console.log(`[Calendar Sync] Calling API: ${action} for session ${sessionId}`);
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[Calendar Sync] Failed (${res.status}):`, data.error || "Unknown error");
      // Show user-friendly error in console (could also show toast notification)
      if (action === "create") {
        console.warn("⚠️ Session created but calendar sync failed. Check server logs.");
      }
    } else {
      console.log(`[Calendar Sync] Success:`, data);
    }
  } catch (e) {
    console.error("[Calendar Sync] Network error:", e);
  }
}
