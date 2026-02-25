import webPush from "web-push";
import { adminDb } from "@/lib/firebase-admin";
import type { PushSubscriptionDoc } from "@/lib/types";

const COLLECTION = "push_subscriptions";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionPayload
): Promise<void> {
  const existing = await adminDb
    .collection(COLLECTION)
    .where("endpoint", "==", sub.endpoint)
    .get();

  const nowIso = new Date().toISOString();

  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    await docRef.set(
      {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: sub.userAgent || null,
        lastUsedAt: nowIso,
      },
      { merge: true }
    );
    return;
  }

  const ref = adminDb.collection(COLLECTION).doc();
  const doc: PushSubscriptionDoc = {
    id: ref.id,
    userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: sub.userAgent || null,
    createdAt: nowIso,
    lastUsedAt: nowIso,
  };
  await ref.set(doc);
}

export async function deletePushSubscriptionByEndpoint(
  userId: string,
  endpoint: string
): Promise<void> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("endpoint", "==", endpoint)
    .get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(
  userId: string,
  message: PushMessage
): Promise<{ success: boolean; errors?: string[] }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, errors: ["VAPID keys not configured"] };
  }

  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();
  if (snap.empty) return { success: false, errors: ["No push subscriptions"] };

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url,
  });

  const errors: string[] = [];
  const nowIso = new Date().toISOString();

  await Promise.all(
    snap.docs.map(async (docSnap) => {
      const sub = docSnap.data() as PushSubscriptionDoc;
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      try {
        await webPush.sendNotification(pushSub as any, payload);
        await docSnap.ref.update({ lastUsedAt: nowIso });
      } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(msg);
        // Clean up gone subscriptions
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await docSnap.ref.delete();
        }
      }
    })
  );

  return { success: errors.length === 0, errors: errors.length ? errors : undefined };
}

