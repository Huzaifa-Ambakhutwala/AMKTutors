import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar";
import type { Session } from "@/lib/types";

type SyncAction = "create" | "update" | "delete";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, action } = body as {
      sessionId?: string;
      action?: SyncAction;
    };

    console.log(`[Calendar Sync API] Received request:`, { sessionId, action });

    if (!sessionId || !action) {
      console.error(`[Calendar Sync API] Missing params:`, { sessionId, action });
      return NextResponse.json(
        { error: "Missing sessionId or action" },
        { status: 400 }
      );
    }

    if (!["create", "update", "delete"].includes(action)) {
      console.error(`[Calendar Sync API] Invalid action:`, action);
      return NextResponse.json(
        { error: "Invalid action. Use create, update, or delete." },
        { status: 400 }
      );
    }

    console.log(`[Calendar Sync API] Fetching session ${sessionId} from Firestore...`);
    const sessionSnap = await adminDb.collection("sessions").doc(sessionId).get();
    console.log(`[Calendar Sync API] Session exists:`, sessionSnap.exists);

    if (action === "delete") {
      const data = sessionSnap.data();
      const eventId =
        data?.googleCalendarEventId ?? (data as Session)?.googleCalendarEventId;
      if (eventId) {
        console.log(`[Calendar Sync API] Deleting calendar event: ${eventId}`);
        try {
          await deleteCalendarEvent(eventId);
          console.log(`[Calendar Sync API] Event deleted successfully`);
        } catch (err: any) {
          // Event might not exist (already deleted, or never created)
          // Log but don't fail - the Firestore session will be deleted anyway
          if (err.code === 404 || err.message?.includes("Not Found")) {
            console.warn(`[Calendar Sync API] Event ${eventId} not found in calendar (may have been deleted already)`);
          } else {
            console.error(`[Calendar Sync API] Error deleting event:`, err);
            throw err; // Re-throw if it's a different error
          }
        }
      } else {
        console.log(`[Calendar Sync API] No googleCalendarEventId found, skipping calendar delete`);
      }
      return NextResponse.json({ ok: true, action: "delete" });
    }

    if (!sessionSnap.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = {
      id: sessionSnap.id,
      ...sessionSnap.data(),
    } as Session & { id: string };

    // Enrich session with tutor calendar color from users collection (if available)
    let sessionForCalendar: Session & { id: string } = session;
    if (session.tutorId) {
      try {
        const tutorSnap = await adminDb.collection("users").doc(session.tutorId).get();
        if (tutorSnap.exists) {
          const tutorData = tutorSnap.data() as any;
          sessionForCalendar = {
            ...session,
            tutorCalendarColorId: tutorData.calendarColorId ?? null,
            tutorCalendarColorBg: tutorData.calendarColorBg ?? null,
            tutorCalendarColorFg: tutorData.calendarColorFg ?? null,
          };
        }
      } catch (e) {
        console.error("[Calendar Sync API] Failed to load tutor color info:", e);
      }
    }

    if (action === "create") {
      console.log(`[Calendar Sync API] Creating calendar event for session ${sessionId}...`);
      const eventId = await createCalendarEvent(sessionForCalendar);
      console.log(`[Calendar Sync API] Event created with ID: ${eventId}`);
      await adminDb.collection("sessions").doc(sessionId).update({
        googleCalendarEventId: eventId,
      });
      console.log(`[Calendar Sync API] Updated session document with event ID`);
      return NextResponse.json({ ok: true, action: "create", eventId });
    }

    if (action === "update") {
      const eventId =
        session.googleCalendarEventId ??
        (sessionSnap.data() as Session)?.googleCalendarEventId;
      if (eventId) {
        await updateCalendarEvent(eventId, sessionForCalendar);
      } else {
        const newEventId = await createCalendarEvent(sessionForCalendar);
        await adminDb.collection("sessions").doc(sessionId).update({
          googleCalendarEventId: newEventId,
        });
      }
      return NextResponse.json({ ok: true, action: "update" });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Calendar Sync API] Error:", err);
    if (err instanceof Error) {
      console.error("[Calendar Sync API] Error stack:", err.stack);
    }
    const message = err instanceof Error ? err.message : "Calendar sync failed";
    return NextResponse.json(
      { error: message, details: err instanceof Error ? err.toString() : String(err) },
      { status: 500 }
    );
  }
}
