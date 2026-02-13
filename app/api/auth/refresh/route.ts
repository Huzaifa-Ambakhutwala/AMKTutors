import { NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  touchSession,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/session";

/** Rolling session: extend expiry on activity. Call with credentials: 'include'. */
export async function POST() {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await touchSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const response = NextResponse.json({
    user: {
      uid: session.userId,
      email: session.email,
      role: session.role,
      name: session.name,
    },
  });

  // Re-set cookie with extended maxAge so client keeps it
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    ...getSessionCookieOptions(true),
  });

  return response;
}
