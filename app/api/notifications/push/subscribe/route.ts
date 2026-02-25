import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  getSession,
} from "@/lib/session";
import {
  savePushSubscription,
  type PushSubscriptionPayload,
} from "@/lib/notifications/push";

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
    subscription: PushSubscriptionPayload;
  };

  if (!body.subscription?.endpoint) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 }
    );
  }

  await savePushSubscription(session.userId, body.subscription);
  return NextResponse.json({ ok: true });
}

