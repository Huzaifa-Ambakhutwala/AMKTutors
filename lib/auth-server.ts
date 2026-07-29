import { adminDb } from "@/lib/firebase-admin";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/** Resolve a Firestore user profile from a Firebase Auth UID (direct doc, shadow doc, or authUid link). */
export async function getUserProfileDocByAuthUid(
  authUid: string
): Promise<DocumentSnapshot | null> {
  const direct = await adminDb.collection("users").doc(authUid).get();
  if (direct.exists) return direct;

  const linked = await adminDb
    .collection("users")
    .where("authUid", "==", authUid)
    .limit(1)
    .get();
  if (!linked.empty) return linked.docs[0];

  return null;
}

/**
 * Ensure users/{authUid} exists with a pointer to the logical profile.
 * Required for Firestore rules (getUserId / getRole) and client session queries.
 */
export async function ensureAuthShadowUser(
  authUid: string,
  profileDoc: DocumentSnapshot
): Promise<void> {
  if (!profileDoc.exists) return;

  const data = profileDoc.data() as Record<string, unknown>;

  // Profile is already the Auth UID doc — repair missing pointer if needed.
  if (profileDoc.id === authUid) {
    if (data.pointer) return;
    const linked = await adminDb
      .collection("users")
      .where("authUid", "==", authUid)
      .limit(1)
      .get();
    if (linked.empty || linked.docs[0].id === authUid) return;
    const logical = linked.docs[0];
    const logicalData = logical.data() as Record<string, unknown>;
    await adminDb.collection("users").doc(authUid).set(
      {
        pointer: logical.id,
        role: logicalData.role ?? data.role,
        isShadow: true,
      },
      { merge: true }
    );
    return;
  }

  // Profile is the logical doc — create/update shadow at Auth UID.
  const shadowRef = adminDb.collection("users").doc(authUid);
  const shadow = await shadowRef.get();

  const payload = {
    uid: authUid,
    email: (data.email as string) ?? null,
    emailLower:
      typeof data.email === "string" ? data.email.toLowerCase() : null,
    name: (data.name as string) ?? null,
    role: data.role,
    pointer: profileDoc.id,
    isShadow: true,
  };

  if (!shadow.exists) {
    await shadowRef.set(payload);
    return;
  }

  const existing = shadow.data() as Record<string, unknown>;
  if (existing.pointer !== profileDoc.id || existing.role !== data.role) {
    await shadowRef.set(payload, { merge: true });
  }
}

export function isLoginRole(role: unknown): role is "ADMIN" | "TUTOR" | "PARENT" {
  return role === "ADMIN" || role === "TUTOR" || role === "PARENT";
}

export function redirectPathForRole(role: "ADMIN" | "TUTOR" | "PARENT"): string {
  if (role === "ADMIN") return "/admin";
  if (role === "TUTOR") return "/tutor";
  return "/parent";
}

type AuthApiError = {
  status: number;
  error: string;
  code?: string;
};

/** Map Firebase / Firestore failures to client-safe auth API responses. */
export function mapAuthServiceError(error: unknown): AuthApiError {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
      ? (error as { code: number }).code
      : undefined;

  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded")
  ) {
    return {
      status: 503,
      error:
        "Database quota exceeded. Check Firebase usage/billing or try again later.",
      code: "FIRESTORE_QUOTA_EXCEEDED",
    };
  }

  if (
    message.includes("Decoding Firebase ID token failed") ||
    message.includes("Firebase ID token has expired") ||
    message.includes("invalid signature")
  ) {
    return {
      status: 401,
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    };
  }

  if (message.includes("Firebase Admin is not configured")) {
    return {
      status: 500,
      error: "Server configuration error",
      code: "SERVER_CONFIG",
    };
  }

  if (code === 7 || message.includes("PERMISSION_DENIED")) {
    return {
      status: 500,
      error: "Database permission error. Contact support.",
      code: "FIRESTORE_PERMISSION_DENIED",
    };
  }

  return {
    status: 500,
    error: "Unable to sign in. Please try again or contact support.",
    code: "AUTH_UNKNOWN",
  };
}
