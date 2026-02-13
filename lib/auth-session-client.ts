/**
 * Create app session from Firebase ID token (after Google sign-in or account linking).
 * Sets cookie and returns user + redirectTo.
 */
export async function createAppSessionFromIdToken(
  idToken: string,
  rememberMe: boolean = true
): Promise<{ user: { uid: string; email: string; role: string; name?: string }; redirectTo: string }> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken, rememberMe }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? "Session creation failed") as Error & { code?: string };
    err.code = data.code;
    throw err;
  }

  return data;
}
