import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  getSession,
} from "@/lib/session";
import { deletePushSubscriptionByEndpoint } from "@/lib/notifications/push";

export async function POST(req: NextRequest) {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const body = (await req.json()) as { endpoint: string };
  if (!body.endpoint) {
    return NextResponse.json(
      { error: "Endpoint is required" },
      { status: 400 }
    );
  }

  await deletePushSubscriptionByEndpoint(session.userId, body.endpoint);
  return NextResponse.json({ ok: true });
}

