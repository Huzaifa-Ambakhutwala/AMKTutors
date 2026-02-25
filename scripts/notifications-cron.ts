/**
 * Minimal cron-style runner for session reminders.
 *
 * This script is intended to be run as a standalone Node process
 * (e.g. `node dist/scripts/notifications-cron.js` every 5 minutes
 * via a scheduler like cron, GitHub Actions, or a cloud task).
 *
 * It looks for sessions within the next 24h / 1h windows and fires
 * SESSION_REMINDER_24H / SESSION_REMINDER_1H events via the
 * NotificationDispatcher.
 *
 * NOTE: This is scaffold only; wire into your production scheduler
 * of choice. Running cron-like tasks inside Vercel serverless
 * functions is not recommended.
 */

import { adminDb } from "@/lib/firebase-admin";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatcher";

async function runOnce() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  const sessionsSnap = await adminDb.collection("sessions").get();
  const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  for (const s of sessions) {
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    if (s.status !== "Scheduled") continue;

    // 24h window
    if (!s.reminder24SentAt && start > now && start <= in24h) {
      await dispatchNotificationEvent("SESSION_REMINDER_24H", {
        sessionId: s.id,
        studentId: s.studentId,
        studentName: s.studentName,
        tutorId: s.tutorId,
        tutorName: s.tutorName,
        parentId: s.parentId,
        sessionDate: start.toLocaleDateString(),
        sessionTime: start.toLocaleTimeString(),
        portalLink: "/parent",
      });
      await adminDb.collection("sessions").doc(s.id).update({
        reminder24SentAt: new Date().toISOString(),
      });
    }

    // 1h window
    if (!s.reminder1SentAt && start > now && start <= in1h) {
      await dispatchNotificationEvent("SESSION_REMINDER_1H", {
        sessionId: s.id,
        studentId: s.studentId,
        studentName: s.studentName,
        tutorId: s.tutorId,
        tutorName: s.tutorName,
        parentId: s.parentId,
        sessionDate: start.toLocaleDateString(),
        sessionTime: start.toLocaleTimeString(),
        portalLink: "/parent",
      });
      await adminDb.collection("sessions").doc(s.id).update({
        reminder1SentAt: new Date().toISOString(),
      });
    }

    // After-session event: fire once shortly after end time
    if (!s.afterEventSentAt && end <= now) {
      await dispatchNotificationEvent("SESSION_AFTER", {
        sessionId: s.id,
        studentId: s.studentId,
        studentName: s.studentName,
        tutorId: s.tutorId,
        tutorName: s.tutorName,
        parentId: s.parentId,
        sessionDate: start.toLocaleDateString(),
        sessionTime: start.toLocaleTimeString(),
        portalLink: "/parent",
      });
      await adminDb.collection("sessions").doc(s.id).update({
        afterEventSentAt: new Date().toISOString(),
      });
    }
  }
}

// If executed directly (not imported), run once.
if (require.main === module) {
  runOnce()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Notifications cron run complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Notifications cron failed", err);
      process.exit(1);
    });
}

