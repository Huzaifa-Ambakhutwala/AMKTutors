/**
 * One-time backfill: set updatedAt (and createdAt if missing) on all sessions.
 *
 * Usage: node scripts/backfill-session-updated-at.mjs
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
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();
const BATCH_SIZE = 400;
let updated = 0;
let skipped = 0;

const snap = await db.collection("sessions").get();
let batch = db.batch();
let batchCount = 0;

for (const docSnap of snap.docs) {
  const data = docSnap.data();
  if (data.updatedAt) {
    skipped++;
    continue;
  }
  const fallback = data.createdAt || data.startTime || new Date().toISOString();
  batch.update(docSnap.ref, {
    updatedAt: fallback,
    ...(!data.createdAt ? { createdAt: fallback } : {}),
  });
  batchCount++;
  updated++;

  if (batchCount >= BATCH_SIZE) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
    console.log(`Committed ${updated} updates...`);
  }
}

if (batchCount > 0) {
  await batch.commit();
}

console.log(`Done. Updated ${updated}, skipped ${skipped} (already had updatedAt).`);
