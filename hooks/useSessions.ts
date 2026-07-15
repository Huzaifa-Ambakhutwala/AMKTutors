"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";
import {
  fetchUpcomingSessionsForTutor,
  fetchUpcomingSessionsForStudentIds,
  getUpcomingFromIso,
  UPCOMING_SESSIONS_LIMIT,
} from "@/lib/sessions-query";
import {
  syncSessionsWithCache,
  refreshSessionsCache,
  type SessionCacheScope,
} from "@/lib/sessions-cache";
import type { Session } from "@/lib/types";

async function fetchParentStudentIds(parentId: string): Promise<string[]> {
  const q = query(
    collection(db, "students"),
    where("parentIds", "array-contains", parentId)
  );
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);
  return snap.docs.map((d) => d.id);
}

export function useParentStudentIds(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ["students", "by-parent", parentId],
    queryFn: () => fetchParentStudentIds(parentId!),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });
}

async function loadUpcomingWithCache(
  scope: SessionCacheScope,
  fetchFresh: () => Promise<Session[]>,
  forceRefresh: boolean
): Promise<Session[]> {
  const rangeEnd = new Date();
  rangeEnd.setFullYear(rangeEnd.getFullYear() + 2);
  const cacheOptions = {
    scope,
    rangeStart: getUpcomingFromIso(),
    rangeEnd: rangeEnd.toISOString(),
    fetchFresh,
  };
  if (forceRefresh) return refreshSessionsCache(cacheOptions);
  return (await syncSessionsWithCache(cacheOptions)).sessions;
}

export function useTutorUpcomingSessions(
  tutorId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["sessions", "upcoming", "tutor", tutorId],
    queryFn: () => {
      if (!tutorId) return Promise.resolve([]);
      const scope: SessionCacheScope = `tutor:${tutorId}:upcoming`;
      return loadUpcomingWithCache(scope, () =>
        fetchUpcomingSessionsForTutor(tutorId, UPCOMING_SESSIONS_LIMIT)
      , false);
    },
    enabled: !!tutorId && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000,
  });
}

export function useParentUpcomingSessions(
  parentId: string | null | undefined,
  studentIds: string[],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["sessions", "upcoming", "parent", parentId, studentIds],
    queryFn: () => {
      if (!parentId || studentIds.length === 0) return Promise.resolve([]);
      const scope: SessionCacheScope = `parent:${parentId}:upcoming`;
      return loadUpcomingWithCache(scope, () =>
        fetchUpcomingSessionsForStudentIds(studentIds, UPCOMING_SESSIONS_LIMIT)
      , false);
    },
    enabled: !!parentId && studentIds.length > 0 && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000,
  });
}

export async function refreshTutorUpcoming(
  tutorId: string,
  queryClient: import("@tanstack/react-query").QueryClient
) {
  const scope: SessionCacheScope = `tutor:${tutorId}:upcoming`;
  const sessions = await loadUpcomingWithCache(
    scope,
    () => fetchUpcomingSessionsForTutor(tutorId, UPCOMING_SESSIONS_LIMIT),
    true
  );
  queryClient.setQueryData(["sessions", "upcoming", "tutor", tutorId], sessions);
  return sessions;
}

export async function refreshParentUpcoming(
  parentId: string,
  studentIds: string[],
  queryClient: import("@tanstack/react-query").QueryClient
) {
  const scope: SessionCacheScope = `parent:${parentId}:upcoming`;
  const sessions = await loadUpcomingWithCache(
    scope,
    () => fetchUpcomingSessionsForStudentIds(studentIds, UPCOMING_SESSIONS_LIMIT),
    true
  );
  queryClient.setQueryData(
    ["sessions", "upcoming", "parent", parentId, studentIds],
    sessions
  );
  return sessions;
}
