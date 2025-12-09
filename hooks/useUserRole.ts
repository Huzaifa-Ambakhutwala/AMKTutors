import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrentUser } from "./useCurrentUser";
import { UserRole } from "@/lib/types";

export function useUserRole() {
    const { user, loading: authLoading } = useCurrentUser();
    const [role, setRole] = useState<UserRole | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        async function fetchRole() {
            if (!user) {
                setRole(null);
                setRoleLoading(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setRole(userData.role as UserRole);
                } else {
                    setRole(null); // User authenticated but no profile doc
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

    return { user, role, loading: authLoading || roleLoading };
}
