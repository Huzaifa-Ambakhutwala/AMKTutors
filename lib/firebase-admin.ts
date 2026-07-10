import * as admin from "firebase-admin";
import "firebase-admin/storage";

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${projectId}.appspot.com`,
  });
}

const app = initFirebaseAdmin();

export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);

export function getAdminStorage() {
  return admin.storage(app);
}
