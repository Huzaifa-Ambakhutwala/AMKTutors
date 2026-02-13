"use client";

import { useState, useEffect, useCallback } from "react";
import { UserRole } from "@/lib/types";

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_ME_URL = "/api/auth/me";
const AUTH_LOGOUT_URL = "/api/auth/logout";

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(AUTH_ME_URL, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const onFocus = () => {
      if (user) {
        fetch("/api/auth/me?extend=1", { credentials: "include" }).then((res) => {
          if (res.ok) res.json().then((data) => data.user && setUser(data.user));
        });
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await fetch(AUTH_LOGOUT_URL, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    refetch: fetchUser,
    logout,
  };
}
