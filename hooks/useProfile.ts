"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await safeFirestore(() => getDoc(doc(db, "users", uid)));
  if (!snap.exists()) return null;
  const data = { ...snap.data(), uid: snap.id } as UserProfile;
  wrapFirestoreResult(data, 1);
  if (data.role !== "ADMIN") {
    delete data.adminNotes;
    delete data.hourlyPayRate;
  }
  return data;
}

export function useProfile(uid: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", uid],
    queryFn: () => fetchUserProfile(uid!),
    enabled: !!uid,
    staleTime: 10 * 60 * 1000,
  });
}

/** Resolve logical tutor/parent id when profile uses a pointer doc. */
export function resolveLogicalUserId(
  profileId: string,
  profile: UserProfile | null | undefined
): string {
  return profile?.pointer ?? profileId;
}

/**
 * Logical user id for Firestore session/student queries.
 * Waits until the profile has loaded so we never query with the Auth UID
 * while rules expect the pointer (logical) id — that causes permission-denied.
 */
export function useLogicalUserId(profileId: string | null | undefined): {
  logicalUserId: string | null;
  profile: UserProfile | null | undefined;
  profileLoading: boolean;
  profileReady: boolean;
} {
  const { data: profile, isLoading, isFetched, isError } = useProfile(profileId);
  const profileReady = !!profileId && isFetched && !isLoading;
  const logicalUserId =
    profileReady && !isError
      ? resolveLogicalUserId(profileId!, profile ?? null)
      : null;

  return {
    logicalUserId,
    profile,
    profileLoading: !!profileId && (isLoading || !isFetched),
    profileReady,
  };
}
