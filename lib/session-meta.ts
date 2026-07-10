import type { Session } from "@/lib/types";

/** Attach timestamps for session create/update writes. */
export function withSessionTimestamps<T extends Record<string, unknown>>(
  data: T,
  options: { isCreate?: boolean } = {}
): T & { updatedAt: string; createdAt?: string } {
  const now = new Date().toISOString();
  return {
    ...data,
    updatedAt: now,
    ...(options.isCreate ? { createdAt: now } : {}),
  };
}

/** Fallback when backfilling or reading legacy sessions. */
export function sessionUpdatedAt(session: Session): string {
  return session.updatedAt ?? session.startTime;
}
