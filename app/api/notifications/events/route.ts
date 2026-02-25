import { NextRequest, NextResponse } from "next/server";
import type { NotificationEventType } from "@/lib/types";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatcher";
import { getSessionIdFromCookie, getSession } from "@/lib/session";

/**
 * Generic event entrypoint to fire notifications from the app.
 * Expects JSON: { eventType, payload }
 */
export async function POST(req: NextRequest) {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const body = (await req.json()) as {
    eventType: NotificationEventType;
    payload: any;
  };

  if (!body.eventType) {
    return NextResponse.json(
      { error: "eventType is required" },
      { status: 400 }
    );
  }

  try {
    await dispatchNotificationEvent(body.eventType, body.payload || {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Notification event dispatch failed:", e);
    return NextResponse.json(
      { error: e?.message || "Dispatch failed" },
      { status: 500 }
    );
  }
}

