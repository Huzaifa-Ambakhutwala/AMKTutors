/**
 * Delete confirmed duplicate sessions and their Google Calendar events.
 *
 * Dry run (default): node scripts/cleanup-duplicate-sessions.mjs
 * Execute:          node scripts/cleanup-duplicate-sessions.mjs --execute
 */
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";

config({ path: ".env.local" });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const calendarId = process.env.GOOGLE_CALENDAR_ID || "tutoring.amk@gmail.com";
const execute = process.argv.includes("--execute");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin env vars");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

/** Older duplicates from overlapping recurring series (Apr 12 recreated Mar 23 slots). */
const DUPLICATE_IDS_TO_DELETE = [
  "7QtILnJhfyVftSGFkCWD", // Fatema Apr 22 duplicate (keep enmA2PY0A6IGywKJ07Qh)
  "YOCQRZKTSd2UD0GoYNSX", // Fatema Apr 29 duplicate (keep A43Ow8OnpFQz3HNjXQtN)
  "edsfG9c8hFa492m9kKj2", // Fatema Apr 27 duplicate (keep OzylyxQ4VEtARLBc8vr5)
];

async function deleteCalendarEvent(eventId) {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId, eventId });
    return true;
  } catch (e) {
    if (e?.code === 404 || e?.message?.includes("Not Found")) return false;
    throw e;
  }
}

console.log(execute ? "=== EXECUTING cleanup ===" : "=== DRY RUN (pass --execute to delete) ===\n");

for (const id of DUPLICATE_IDS_TO_DELETE) {
  const ref = db.collection("sessions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`SKIP ${id}: not in Firestore`);
    continue;
  }
  const data = snap.data();
  console.log(
    `DELETE ${id} | ${data.studentName} | ${data.startTime?.slice(0, 16)} | gcal=${data.googleCalendarEventId ?? "—"}`
  );
  if (!execute) continue;

  if (data.googleCalendarEventId) {
    const removed = await deleteCalendarEvent(data.googleCalendarEventId);
    console.log(`  Calendar event ${data.googleCalendarEventId}: ${removed ? "deleted" : "already gone"}`);
  }
  await ref.delete();
  console.log(`  Firestore doc deleted`);
}

console.log("\nDone.");
