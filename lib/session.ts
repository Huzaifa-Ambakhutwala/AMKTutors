import { cookies } from "next/headers";
import { adminDb } from "./firebase-admin";
import { UserRole } from "./types";

const SESSION_COOKIE_NAME = "amk_session";
const SESSION_MAX_AGE_DAYS = 30;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const ROLLING_EXTEND_MS = 7 * 24 * 60 * 60 * 1000; // extend by 7 days on activity

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface SessionRecord {
  userId: string;
  email: string;
  role: UserRole;
  name?: string;
  expiresAt: string; // ISO
  createdAt: string;
  lastActivityAt?: string;
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  user: SessionUser,
  options: { rememberMe?: boolean } = {}
): Promise<string> {
  const sessionId = generateSessionId();
  const now = new Date();
  const maxAge = options.rememberMe ? SESSION_MAX_AGE_MS : 24 * 60 * 60 * 1000; // 1 day if not remember
  const expiresAt = new Date(now.getTime() + maxAge);

  await adminDb.collection("authSessions").doc(sessionId).set({
    userId: user.uid,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
  });

  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  if (!sessionId) return null;
  const doc = await adminDb.collection("authSessions").doc(sessionId).get();
  if (!doc.exists) return null;
  const data = doc.data() as Omit<SessionRecord, "expiresAt"> & { expiresAt: string };
  const expiresAt = new Date(data.expiresAt);
  if (expiresAt <= new Date()) {
    await adminDb.collection("authSessions").doc(sessionId).delete();
    return null;
  }
  return data as SessionRecord;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await adminDb.collection("authSessions").doc(sessionId).delete();
}

/** Optionally extend session (rolling). Returns updated session or null. */
export async function touchSession(sessionId: string): Promise<SessionRecord | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const newExpires = new Date(Date.now() + ROLLING_EXTEND_MS);
  await adminDb.collection("authSessions").doc(sessionId).update({
    lastActivityAt: new Date().toISOString(),
    expiresAt: newExpires.toISOString(),
  });
  return getSession(sessionId);
}

const ONE_DAY_SECONDS = 24 * 60 * 60;

export function getSessionCookieOptions(rememberMe: boolean) {
  const maxAge = rememberMe ? SESSION_MAX_AGE_DAYS * 24 * 60 * 60 : ONE_DAY_SECONDS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value ?? null;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS };
