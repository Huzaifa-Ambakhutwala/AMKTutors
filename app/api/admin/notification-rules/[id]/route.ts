import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationRuleById,
  updateNotificationRule,
  deleteNotificationRule,
} from "@/lib/notifications/rules";
import type {
  NotificationRuleChannels,
  NotificationRuleTemplate,
  NotificationEventType,
  NotificationAudienceType,
  UserRole,
} from "@/lib/types";
import { getSessionIdFromCookie, getSession } from "@/lib/session";

async function ensureAdmin() {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const rule = await getNotificationRuleById(id);
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ rule });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Partial<{
    name: string;
    enabled: boolean;
    eventType: NotificationEventType;
    audienceType: NotificationAudienceType;
    roles: UserRole[];
    channels: NotificationRuleChannels;
    template: NotificationRuleTemplate;
  }>;

  const { id } = await context.params;
  const updated = await updateNotificationRule(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ rule: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  await deleteNotificationRule(id);
  return NextResponse.json({ ok: true });
}

