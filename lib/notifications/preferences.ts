import { adminDb } from "@/lib/firebase-admin";
import type { UserNotificationSettings } from "@/lib/types";

const COLLECTION = "user_notification_settings";

export async function getUserNotificationSettings(
  userId: string
): Promise<UserNotificationSettings> {
  const ref = adminDb.collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  const nowIso = new Date().toISOString();

  if (!snap.exists) {
    const defaults: UserNotificationSettings = {
      userId,
      pushEnabled: false,
      emailEnabled: true,
      smsEnabled: false,
      updatedAt: nowIso,
    };
    await ref.set(defaults);
    return defaults;
  }

  return snap.data() as UserNotificationSettings;
}

export async function updateUserNotificationSettings(
  userId: string,
  patch: Partial<Omit<UserNotificationSettings, "userId" | "updatedAt">>
): Promise<UserNotificationSettings> {
  const ref = adminDb.collection(COLLECTION).doc(userId);
  const nowIso = new Date().toISOString();
  await ref.set(
    {
      userId,
      ...patch,
      updatedAt: nowIso,
    },
    { merge: true }
  );
  const snap = await ref.get();
  return snap.data() as UserNotificationSettings;
}

