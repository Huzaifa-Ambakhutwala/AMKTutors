"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { useProfile } from "@/hooks/useProfile";

/** @deprecated Prefer useProfile(uid) — avoids duplicate Firestore reads. */
export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const { data: userProfile, isLoading: profileLoading } = useProfile(
        authReady ? user?.uid : null
    );

    return {
        user,
        userProfile: userProfile ?? null,
        loading: !authReady || profileLoading,
    };
}
