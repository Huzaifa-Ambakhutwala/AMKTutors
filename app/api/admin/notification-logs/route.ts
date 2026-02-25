import { NextRequest, NextResponse } from "next/server";
import { listNotificationLogs } from "@/lib/notifications/rules";
import { getSessionIdFromCookie, getSession } from "@/lib/session";

async function ensureAdmin() {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const logs = await listNotificationLogs(limit);
  return NextResponse.json({ logs });
}

