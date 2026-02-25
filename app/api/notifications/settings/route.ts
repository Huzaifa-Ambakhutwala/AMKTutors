import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  getSession,
} from "@/lib/session";
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from "@/lib/notifications/preferences";

export async function GET(req: NextRequest) {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const settings = await getUserNotificationSettings(session.userId);
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const body = await req.json();
  const { pushEnabled, emailEnabled } = body as {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
  };

  const updated = await updateUserNotificationSettings(session.userId, {
    ...(pushEnabled !== undefined ? { pushEnabled } : null),
    ...(emailEnabled !== undefined ? { emailEnabled } : null),
    // smsEnabled stays as-is for now.
  });

  return NextResponse.json({ settings: updated });
}

