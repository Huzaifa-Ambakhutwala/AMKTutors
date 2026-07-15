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

/** Resolve logical tutor id when profile uses a pointer doc. */
export function resolveLogicalUserId(
  profileId: string,
  profile: UserProfile | null | undefined
): string {
  return profile?.pointer ?? profileId;
}
