import { NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  getSession,
  touchSession,
} from "@/lib/session";

export async function GET(request: Request) {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Optional: rolling session on activity (e.g. only if header says so to avoid every tab touch)
  const url = new URL(request.url);
  const extend = url.searchParams.get("extend") === "1";
  const session = extend
    ? await touchSession(sessionId)
    : await getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      uid: session.userId,
      email: session.email,
      role: session.role,
      name: session.name,
    },
  });
}
