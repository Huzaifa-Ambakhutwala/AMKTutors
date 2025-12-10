import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../lib/types";

export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserProfile;

                        // Security: Strip Admin-only fields for non-admins
                        if (data.role !== 'ADMIN') {
                            delete data.adminNotes;
                            delete data.hourlyPayRate;
                        }

                        setUserProfile(data);
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, userProfile, loading };
}
