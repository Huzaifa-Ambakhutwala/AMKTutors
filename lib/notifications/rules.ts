import { adminDb } from "@/lib/firebase-admin";
import type {
  NotificationEventType,
  NotificationLog,
  NotificationRule,
  NotificationLogStatus,
} from "@/lib/types";

const RULES_COLLECTION = "notification_rules";
const LOGS_COLLECTION = "notification_logs";

export async function getEnabledRulesForEvent(
  eventType: NotificationEventType
): Promise<NotificationRule[]> {
  const snap = await adminDb
    .collection(RULES_COLLECTION)
    .where("eventType", "==", eventType)
    .where("enabled", "==", true)
    .get();
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as NotificationRule)
  );
}

export async function createNotificationRule(
  rule: Omit<NotificationRule, "id" | "createdAt" | "updatedAt">
): Promise<NotificationRule> {
  const nowIso = new Date().toISOString();
  const ref = adminDb.collection(RULES_COLLECTION).doc();
  const doc: NotificationRule = {
    id: ref.id,
    ...rule,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await ref.set(doc);
  return doc;
}

export async function updateNotificationRule(
  id: string,
  patch: Partial<Omit<NotificationRule, "id" | "createdAt" | "updatedAt">>
): Promise<NotificationRule | null> {
  const ref = adminDb.collection(RULES_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const nowIso = new Date().toISOString();
  await ref.set({ ...patch, updatedAt: nowIso }, { merge: true });
  const updated = await ref.get();
  return updated.data() as NotificationRule;
}

export async function deleteNotificationRule(id: string): Promise<void> {
  await adminDb.collection(RULES_COLLECTION).doc(id).delete();
}

export async function listNotificationRules(): Promise<NotificationRule[]> {
  const snap = await adminDb.collection(RULES_COLLECTION).get();
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as NotificationRule)
  );
}

export async function getNotificationRuleById(
  id: string
): Promise<NotificationRule | null> {
  const snap = await adminDb.collection(RULES_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as NotificationRule;
}

export async function logNotification(
  log: Omit<NotificationLog, "id" | "createdAt">
): Promise<void> {
  const ref = adminDb.collection(LOGS_COLLECTION).doc();
  const nowIso = new Date().toISOString();
  const doc: NotificationLog = {
    id: ref.id,
    ...log,
    createdAt: nowIso,
  };
  await ref.set(doc);
}

export async function listNotificationLogs(
  limit = 50
): Promise<NotificationLog[]> {
  const snap = await adminDb
    .collection(LOGS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as NotificationLog)
  );
}

export function buildLogStatus(
  channelsAttempted: NotificationLog["channelsAttempted"],
  hadError: boolean
): NotificationLogStatus {
  if (hadError) return "FAILED";
  const any =
    channelsAttempted.push ||
    channelsAttempted.email ||
    channelsAttempted.sms;
  return any ? "SENT" : "SKIPPED";
}

