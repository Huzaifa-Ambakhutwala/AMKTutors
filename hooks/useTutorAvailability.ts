"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TutorAvailability, RecurringAvailabilitySlot, AvailabilityBlock } from "@/lib/types";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";

export type TutorAvailabilityData = {
  recurring: RecurringAvailabilitySlot[];
  blocks: AvailabilityBlock[];
};

async function fetchTutorAvailability(tutorId: string): Promise<TutorAvailabilityData> {
  const snap = await safeFirestore(() => getDoc(doc(db, "availability", tutorId)));
  if (!snap.exists()) {
    return { recurring: [], blocks: [] };
  }
  wrapFirestoreResult(snap, 1);
  const data = snap.data() as TutorAvailability;
  return {
    recurring: data.recurring || [],
    blocks: data.blocks || [],
  };
}

export function useTutorAvailability(tutorId: string | null | undefined) {
  return useQuery({
    queryKey: ["availability", tutorId],
    queryFn: () => fetchTutorAvailability(tutorId!),
    enabled: !!tutorId,
    staleTime: 5 * 60 * 1000,
  });
}
