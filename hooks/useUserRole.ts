"use client";

import { useAuth } from "./useAuth";
import { UserRole } from "@/lib/types";

/** Session-based auth: user and role from /api/auth/me cookie. */
export function useUserRole() {
  const { user, loading } = useAuth();
  const role = user?.role ?? null;
  const profileId = user?.uid ?? null;

  return {
    user: user ? { uid: user.uid, email: user.email } : null,
    role: role as UserRole | null,
    profileId,
    loading,
  };
}
