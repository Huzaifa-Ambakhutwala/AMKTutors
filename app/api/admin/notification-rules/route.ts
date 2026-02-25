import { NextRequest, NextResponse } from "next/server";
import {
  listNotificationRules,
  createNotificationRule,
} from "@/lib/notifications/rules";
import type {
  NotificationRule,
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

export async function GET(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rules = await listNotificationRules();
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name: string;
    enabled: boolean;
    eventType: NotificationEventType;
    audienceType: NotificationAudienceType;
    roles?: UserRole[];
    channels: NotificationRuleChannels;
    template: NotificationRuleTemplate;
  };

  const rule = await createNotificationRule({
    name: body.name,
    enabled: body.enabled,
    eventType: body.eventType,
    audienceType: body.audienceType,
    roles: body.roles,
    channels: body.channels,
    template: body.template,
  });

  return NextResponse.json({ rule });
}

