import { useState, useEffect } from "react";
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrentUser } from "./useCurrentUser";
import { UserRole } from "@/lib/types";

export function useUserRole() {
    const { user, loading: authLoading } = useCurrentUser();
    const [role, setRole] = useState<UserRole | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        async function fetchRole() {
            if (!user) {
                setRole(null);
                setProfileId(null);
                setRoleLoading(false);
                return;
            }

            try {
                // Strategy A: Check if Doc ID == UID (Legacy + some creates)
                let userDocSnap = await getDoc(doc(db, "users", user.uid));

                // Strategy B: Query by authUid (Invite Flow)
                // OR Check for Shadow Doc Pointer
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.isShadow && data.pointer) {
                        // Follow the pointer to the Real Doc? 
                        // Actually, we just need the Real ID (pointer).
                        // The Role is already in the Shadow Doc (copied).
                        setRole(data.role as UserRole);
                        setProfileId(data.pointer);
                        setRoleLoading(false);
                        return;
                    }
                }

                // Fallback Query (if Shadow Doc missing for some reason or direct match)
                if (!userDocSnap.exists()) {
                    const q = query(collection(db, "users"), where("authUid", "==", user.uid));
                    const querySnap = await getDocs(q);
                    if (!querySnap.empty) {
                        userDocSnap = querySnap.docs[0];
                    }
                }

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setRole(userData.role as UserRole);
                    setProfileId(userDocSnap.id);
                } else {
                    console.log("No user profile found for UID:", user.uid);
                    setRole(null);
                    setProfileId(null);
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                setRole(null);
            } finally {
                setRoleLoading(false);
            }
        }

        if (!authLoading) {
            setRoleLoading(true); // Reset loading when auth user changes
            fetchRole();
        }
    }, [user, authLoading]);

    return { user, role, profileId, loading: authLoading || roleLoading };
}
