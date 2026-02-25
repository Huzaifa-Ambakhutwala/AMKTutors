import { adminDb } from "@/lib/firebase-admin";
import type {
  NotificationEventType,
  NotificationRule,
  UserNotificationSettings,
  UserRole,
} from "@/lib/types";
import { getUserNotificationSettings } from "./preferences";
import { renderRuleTemplate } from "./template";
import { sendPushToUser } from "./push";
import { sendEmail } from "./email";
import {
  buildLogStatus,
  getEnabledRulesForEvent,
  logNotification,
} from "./rules";

type EventPayload = {
  // common
  portalLink?: string;
  studentId?: string;
  studentName?: string;
  tutorId?: string;
  tutorName?: string;
  parentId?: string;
  parentName?: string;
  sessionId?: string;
  sessionDate?: string;
  sessionTime?: string;
  invoiceId?: string;
};

interface Recipient {
  userId: string;
  email?: string | null;
  role: UserRole;
}

async function resolveAudience(
  rule: NotificationRule,
  eventType: NotificationEventType,
  payload: EventPayload
): Promise<Recipient[]> {
  const usersCol = adminDb.collection("users");

  if (rule.audienceType === "ADMIN_ALL") {
    const snap = await usersCol.where("role", "==", "ADMIN").get();
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        userId: d.id,
        email: data.email ?? null,
        role: data.role,
      };
    });
  }

  if (rule.audienceType === "PARENT_OF_STUDENT") {
    const parentId = payload.parentId;
    if (!parentId) return [];
    const doc = await usersCol.doc(parentId).get();
    if (!doc.exists) return [];
    const data = doc.data() as any;
    return [
      {
        userId: doc.id,
        email: data.email ?? null,
        role: data.role,
      },
    ];
  }

  if (rule.audienceType === "TUTOR_ASSIGNED") {
    const tutorId = payload.tutorId;
    if (!tutorId) return [];
    const doc = await usersCol.doc(tutorId).get();
    if (!doc.exists) return [];
    const data = doc.data() as any;
    return [
      {
        userId: doc.id,
        email: data.email ?? null,
        role: data.role,
      },
    ];
  }

  if (rule.audienceType === "CUSTOM_BY_ROLE" && rule.roles?.length) {
    const snap = await usersCol
      .where("role", "in", rule.roles)
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        userId: d.id,
        email: data.email ?? null,
        role: data.role,
      };
    });
  }

  return [];
}

export async function dispatchNotificationEvent(
  eventType: NotificationEventType,
  payload: EventPayload
): Promise<void> {
  const rules = await getEnabledRulesForEvent(eventType);
  if (!rules.length) return;

  const vars: Record<string, string> = {
    studentName: payload.studentName || "",
    tutorName: payload.tutorName || "",
    sessionDate: payload.sessionDate || "",
    sessionTime: payload.sessionTime || "",
    portalLink: payload.portalLink || "",
  };

  for (const rule of rules) {
    const recipients = await resolveAudience(rule, eventType, payload);
    if (!recipients.length) continue;

    const template = renderRuleTemplate(rule.template, vars);

    for (const recipient of recipients) {
      const prefs: UserNotificationSettings =
        await getUserNotificationSettings(recipient.userId);

      const channelsAttempted: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      } = {};
      let hadError = false;
      const errorDetails: string[] = [];

      // Push
      if (rule.channels.push && prefs.pushEnabled) {
        channelsAttempted.push = true;
        try {
          const res = await sendPushToUser(recipient.userId, {
            title: template.title,
            body: template.body,
            url: payload.portalLink,
          });
          if (!res.success) {
            hadError = true;
            errorDetails.push(
              `push: ${res.errors?.join("; ") || "unknown error"}`
            );
          }
        } catch (e) {
          hadError = true;
          errorDetails.push(
            `push: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      // Email
      if (
        rule.channels.email &&
        prefs.emailEnabled &&
        recipient.email
      ) {
        channelsAttempted.email = true;
        try {
          await sendEmail({
            to: recipient.email,
            subject: template.emailSubject,
            html: template.emailHtml,
          });
        } catch (e) {
          hadError = true;
          errorDetails.push(
            `email: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      // SMS (stub only)
      if (rule.channels.sms && prefs.smsEnabled) {
        channelsAttempted.sms = true;
        // Intentionally not implemented.
      }

      const status = buildLogStatus(channelsAttempted, hadError);

      await logNotification({
        eventType,
        ruleId: rule.id,
        recipientUserId: recipient.userId,
        channelsAttempted,
        status,
        error: hadError ? errorDetails.join(" | ") || "Unknown error" : null,
      });
    }
  }
}

