/**
 * Audit sessions collection for duplicates, orphans, and suspicious patterns.
 * Usage: node scripts/audit-sessions.mjs
 */
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin env vars in .env.local");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();
const snap = await db.collection("sessions").get();
const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

console.log(`\n=== Session audit (${sessions.length} total) ===\n`);

// Group by student+tutor+startTime (exact duplicate fingerprint)
const byFingerprint = new Map();
for (const s of sessions) {
  const key = `${s.studentId}|${s.tutorId}|${s.startTime}`;
  if (!byFingerprint.has(key)) byFingerprint.set(key, []);
  byFingerprint.get(key).push(s);
}

const duplicates = [...byFingerprint.entries()].filter(([, list]) => list.length > 1);
if (duplicates.length) {
  console.log(`DUPLICATE SESSIONS (same student+tutor+startTime): ${duplicates.length} groups\n`);
  for (const [key, list] of duplicates) {
    console.log(`  Fingerprint: ${key}`);
    for (const s of list) {
      console.log(
        `    - ${s.id} | ${s.studentName} | ${s.subject} | ${s.status} | createdAt=${s.createdAt ?? "—"} | updatedAt=${s.updatedAt ?? "—"} | gcal=${s.googleCalendarEventId ?? "—"}`
      );
    }
    console.log();
  }
} else {
  console.log("No exact duplicate fingerprints found.\n");
}

// Recurring series with mixed statuses
const bySeries = new Map();
for (const s of sessions) {
  if (!s.recurringSeriesId) continue;
  if (!bySeries.has(s.recurringSeriesId)) bySeries.set(s.recurringSeriesId, []);
  bySeries.get(s.recurringSeriesId).push(s);
}

const seriesGroups = [...bySeries.entries()].filter(([, list]) => list.length > 1);
if (seriesGroups.length) {
  console.log(`RECURRING SERIES: ${seriesGroups.length} series\n`);
  for (const [seriesId, list] of seriesGroups) {
    const statuses = [...new Set(list.map((s) => s.status))];
    console.log(`  Series ${seriesId}: ${list.length} sessions, statuses=[${statuses.join(", ")}]`);
    if (list.length <= 8) {
      for (const s of list.sort((a, b) => a.startTime.localeCompare(b.startTime))) {
        console.log(`    ${s.startTime.slice(0, 10)} ${s.id} ${s.status}`);
      }
    }
    console.log();
  }
}

// Sessions backfilled recently (updatedAt equals startTime/createdAt pattern from backfill)
const backfillPattern = sessions.filter((s) => {
  if (!s.updatedAt) return false;
  const fallback = s.createdAt || s.startTime;
  return s.updatedAt === fallback;
});
console.log(`Sessions with backfill-style updatedAt (=createdAt|startTime): ${backfillPattern.length}\n`);

// Future scheduled sessions (what calendar shows prominently)
const now = new Date();
const futureScheduled = sessions
  .filter((s) => s.status === "Scheduled" && new Date(s.startTime) >= now)
  .sort((a, b) => a.startTime.localeCompare(b.startTime));

console.log(`Future Scheduled sessions: ${futureScheduled.length}`);
for (const s of futureScheduled.slice(0, 30)) {
  console.log(
    `  ${s.startTime.slice(0, 16)} | ${s.studentName} | ${s.tutorName} | ${s.subject} | ${s.id}`
  );
}
if (futureScheduled.length > 30) {
  console.log(`  ... and ${futureScheduled.length - 30} more`);
}

// Evaluation placeholder sessions still scheduled
const evalPlaceholders = sessions.filter(
  (s) =>
    s.studentId?.includes("EVALUATION") ||
    s.subject === "Evaluation"
);
console.log(`\nEvaluation-linked sessions: ${evalPlaceholders.length}`);
for (const s of evalPlaceholders) {
  console.log(
    `  ${s.startTime?.slice(0, 10)} | ${s.studentName} | ${s.status} | ${s.id} | evalId=${s.evaluationId ?? "—"}`
  );
}

// Sessions with googleCalendarEventId
const withGcal = sessions.filter((s) => s.googleCalendarEventId);
console.log(`\nSessions with Google Calendar event ID: ${withGcal.length}`);

// Suspicious: cancelled but still has future startTime and gcal event
const cancelledFuture = sessions.filter(
  (s) => s.status === "Cancelled" && new Date(s.startTime) >= now && s.googleCalendarEventId
);
if (cancelledFuture.length) {
  console.log(`\nCancelled future sessions still linked to Google Calendar: ${cancelledFuture.length}`);
  for (const s of cancelledFuture) {
    console.log(`  ${s.id} | ${s.startTime.slice(0, 10)} | ${s.studentName} | gcal=${s.googleCalendarEventId}`);
  }
}

console.log("\n=== Audit complete ===\n");
