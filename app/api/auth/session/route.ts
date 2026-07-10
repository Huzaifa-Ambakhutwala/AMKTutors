import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isLoginRole, mapAuthServiceError, redirectPathForRole } from "@/lib/auth-server";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

/**
 * Create app session from Firebase ID token (e.g. after Google Sign-In or account linking).
 * Verifies token, ensures user record exists, creates session.
 *
 * Policy: Google sign-in is only allowed when the email already exists in the DB with a valid role.
 * - If users/{uid} exists: use it (existing user or linked).
 * - If not: query users by email. If exactly one doc with role ADMIN/TUTOR/PARENT, create shadow + link and create session.
 * - If no matching user in DB: return 403 NOT_IN_DB (do not create any user).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, rememberMe = true } = body as {
      idToken?: string;
      rememberMe?: boolean;
    };

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "idToken is required" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email ?? "").trim();
    const name = decoded.name ?? null;

    let userDoc = await adminDb.collection("users").doc(uid).get();
    let profile = userDoc.data() as Record<string, unknown> | undefined;
    let role = profile?.role as string | undefined;

    // First-time Google sign-in: no doc at users/{uid}. Find existing user by email (exact) or emailLower (case-insensitive).
    // Firestore auto-creates single-field indexes for these equality queries.
    if (!userDoc.exists || !profile) {
      const emailLower = email.toLowerCase();
      const usersRef = adminDb.collection("users");
      const [snapExact, snapLower] = await Promise.all([
        usersRef.where("email", "==", email).get(),
        usersRef.where("emailLower", "==", emailLower).get(),
      ]);
      const byId = new Map<string, (typeof snapExact.docs)[number]>();
      for (const d of snapExact.docs) byId.set(d.id, d);
      for (const d of snapLower.docs) if (!byId.has(d.id)) byId.set(d.id, d as (typeof snapExact.docs)[number]);
      const snapshot = { docs: [...byId.values()] };

      const candidates = snapshot.docs.filter((d) => {
        const data = d.data() as { role?: string; isShadow?: boolean };
        if (data.isShadow === true) return false;
        return (
          data.role === "ADMIN" ||
          data.role === "TUTOR" ||
          data.role === "PARENT"
        );
      });

      let existingDoc: (typeof snapshot.docs)[number] | null = null;
      if (candidates.length === 1) {
        existingDoc = candidates[0];
      } else if (candidates.length > 1) {
        const invited = candidates.find((d) => d.data().authUid == null);
        existingDoc = invited ?? candidates[0];
      }

      if (existingDoc) {
        const existingId = existingDoc.id;
        const existingData = existingDoc.data();
        const existingRole = (existingData.role as string) ?? "";

        const emailLowerNorm = (email || "").toLowerCase();
        await adminDb.collection("users").doc(uid).set(
          {
            uid,
            email: email || null,
            emailLower: emailLowerNorm || null,
            name: name ?? null,
            role: existingRole,
            pointer: existingId,
            isShadow: true,
          },
          { merge: true }
        );

        await adminDb.collection("users").doc(existingId).update({
          authUid: uid,
          emailLower: emailLowerNorm || null,
          ...(existingData.status === "invited" ? { status: "registered" } : {}),
        });

        profile = {
          ...existingData,
          uid,
          email: (existingData.email as string) ?? email,
          name: (name ?? existingData.name) ?? null,
          role: existingRole,
        };
        role = existingRole;
      } else {
        return NextResponse.json(
          {
            error:
              "No account found for this email. Please contact an administrator or use an invite link.",
            code: "NOT_IN_DB",
          },
          { status: 403 }
        );
      }
    }

    if (!isLoginRole(role)) {
      return NextResponse.json(
        {
          error: "Account is pending approval. Please contact an administrator.",
          code: "PENDING",
        },
        { status: 403 }
      );
    }

    const sessionId = await createSession(
      {
        uid,
        email: (profile?.email as string) ?? email,
        role,
        name: (profile?.name as string) ?? name ?? undefined,
      },
      { rememberMe: !!rememberMe }
    );

    const cookieOptions = getSessionCookieOptions(!!rememberMe);
    const response = NextResponse.json({
      user: {
        uid,
        email: (profile?.email as string) ?? email,
        role,
        name: (profile?.name as string) ?? name,
      },
      redirectTo: redirectPathForRole(role),
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);
    return response;
  } catch (e) {
    console.error("Session create error:", e);
    const mapped = mapAuthServiceError(e);
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: mapped.status }
    );
  }
}
