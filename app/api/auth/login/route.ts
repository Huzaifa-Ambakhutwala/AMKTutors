import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getUserProfileDocByAuthUid,
  isLoginRole,
  mapAuthServiceError,
  redirectPathForRole,
} from "@/lib/auth-server";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;

async function checkRateLimit(email: string): Promise<{ allowed: boolean }> {
  const key = email.toLowerCase().trim();
  const ref = adminDb.collection("loginAttempts").doc(key);
  const doc = await ref.get();
  const now = Date.now();

  if (!doc.exists) {
    return { allowed: true };
  }

  const data = doc.data();
  const count = (data?.count as number) ?? 0;
  const lastAt = (data?.lastAttemptAt as number) ?? 0;

  if (now - lastAt > RATE_LIMIT_WINDOW_MS) {
    await ref.delete();
    return { allowed: true };
  }

  if (count >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  return { allowed: true };
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = email.toLowerCase().trim();
  const ref = adminDb.collection("loginAttempts").doc(key);
  const doc = await ref.get();
  const now = Date.now();

  if (!doc.exists) {
    await ref.set({ count: 1, lastAttemptAt: now });
    return;
  }

  const data = doc.data();
  const lastAt = (data?.lastAttemptAt as number) ?? 0;
  const count = now - lastAt > RATE_LIMIT_WINDOW_MS ? 1 : (data?.count as number) + 1;

  await ref.set({ count, lastAttemptAt: now });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const rate = await checkRateLimit(email);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Sign in with Firebase Auth REST API to get idToken (server-side verify)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      await recordFailedAttempt(email);
      const message =
        data?.error?.message === "INVALID_LOGIN_CREDENTIALS"
          ? "Invalid email or password"
          : data?.error?.message ?? "Authentication failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const uid = data.localId as string | undefined;
    if (!data.idToken || !uid) {
      return NextResponse.json({ error: "Invalid response from auth" }, { status: 500 });
    }

    const userDoc = await getUserProfileDocByAuthUid(uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User profile not found. Please use your invite link or contact an administrator." },
        { status: 403 }
      );
    }

    const profile = userDoc.data();
    const role = profile?.role as string;
    if (!isLoginRole(role)) {
      return NextResponse.json(
        { error: "Account is not approved for login" },
        { status: 403 }
      );
    }

    const sessionId = await createSession(
      {
        uid,
        email: profile?.email ?? email,
        role: role as "ADMIN" | "TUTOR" | "PARENT",
        name: profile?.name,
      },
      { rememberMe: !!rememberMe }
    );

    const cookieOptions = getSessionCookieOptions(!!rememberMe);
    const response = NextResponse.json({
      user: {
        uid,
        email: profile?.email ?? email,
        role,
        name: profile?.name,
      },
      redirectTo: redirectPathForRole(role),
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);

    return response;
  } catch (e) {
    console.error("Login error:", e);
    const mapped = mapAuthServiceError(e);
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: mapped.status }
    );
  }
}
