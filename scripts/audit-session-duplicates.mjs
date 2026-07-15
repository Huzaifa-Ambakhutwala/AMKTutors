/**
 * Find overlapping recurring series and sessions that look like accidental duplicates.
 * Usage: node scripts/audit-session-duplicates.mjs
 */
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin env vars");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();
const snap = await db.collection("sessions").get();
const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// Exact duplicates — recommend keeping newer (by createdAt)
const byFp = new Map();
for (const s of sessions) {
  const key = `${s.studentId}|${s.tutorId}|${s.startTime}`;
  if (!byFp.has(key)) byFp.set(key, []);
  byFp.get(key).push(s);
}

const duplicateGroups = [...byFp.entries()].filter(([, l]) => l.length > 1);

console.log("=== EXACT DUPLICATE PAIRS (recommend deleting OLDER createdAt) ===\n");
const toDelete = [];

for (const [, list] of duplicateGroups) {
  const sorted = [...list].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  const keep = sorted[sorted.length - 1];
  const remove = sorted.slice(0, -1);
  console.log(`${keep.studentName} | ${keep.startTime} | ${keep.subject}`);
  console.log(`  KEEP:   ${keep.id} (created ${keep.createdAt}) gcal=${keep.googleCalendarEventId}`);
  for (const r of remove) {
    console.log(`  DELETE: ${r.id} (created ${r.createdAt}) gcal=${r.googleCalendarEventId}`);
    toDelete.push(r);
  }
  console.log();
}

// Fatema series overlap detail
const fatemaStudentId = "tJYMZxiAa87YafSoqg0D";
const fatemaSessions = sessions
  .filter((s) => s.studentId === fatemaStudentId && s.status === "Scheduled")
  .sort((a, b) => a.startTime.localeCompare(b.startTime));

console.log(`\n=== Fatema Mogri scheduled sessions (${fatemaSessions.length}) ===\n`);
for (const s of fatemaSessions) {
  console.log(
    `${s.startTime.slice(0, 10)} | ${s.id} | series=${s.recurringSeriesId ?? "—"} | created=${s.createdAt?.slice(0, 10)}`
  );
}

// Old stale scheduled sessions (start before today but still Scheduled)
const today = new Date();
today.setHours(0, 0, 0, 0);
const staleScheduled = sessions.filter(
  (s) => s.status === "Scheduled" && new Date(s.startTime) < today
);
console.log(`\n=== STALE Scheduled (past start date, never completed/cancelled): ${staleScheduled.length} ===\n`);
for (const s of staleScheduled.slice(0, 40)) {
  console.log(
    `${s.startTime.slice(0, 10)} | ${s.studentName} | ${s.tutorName} | ${s.id} | series=${s.recurringSeriesId ?? "—"}`
  );
}
if (staleScheduled.length > 40) console.log(`... and ${staleScheduled.length - 40} more`);

console.log("\n=== SUMMARY ===");
console.log(`Exact duplicates to remove: ${toDelete.length}`);
console.log(`Stale scheduled sessions: ${staleScheduled.length}`);
console.log("\nDuplicate IDs to delete:");
console.log(toDelete.map((s) => s.id).join("\n"));
