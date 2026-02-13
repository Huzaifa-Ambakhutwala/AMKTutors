import { NextResponse } from "next/server";
import {
  getSessionIdFromCookie,
  deleteSession,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/session";

export async function POST() {
  const sessionId = await getSessionIdFromCookie();
  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(false),
    maxAge: 0,
  });
  return response;
}
