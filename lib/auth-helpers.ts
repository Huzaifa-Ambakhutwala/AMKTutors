import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    UserCredential
} from "firebase/auth";
import { auth, db } from "./firebase"; // added db import
import { collection, getDocs, query, where, updateDoc, doc, setDoc } from "firebase/firestore"; // Firestore methods
import { UserProfile } from "./types";

export const signUpWithEmailPassword = async (email: string, password: string): Promise<UserCredential> => {
    try {
        // 1. Create Auth Account
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;

        // 2. Check for Existing Profile (Invited via Admin)
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Link to existing profile: Update the document ID to match UID
            // Firestore doesn't support changing Doc ID, so we copy content to new Doc(UID) and delete old
            const oldDoc = querySnapshot.docs[0];
            const oldData = oldDoc.data();

            await setDoc(doc(db, "users", uid), {
                ...oldData,
                uid: uid, // Ensure UID matches
                authLinked: true // Mark as linked
            });

            // Delete the old "invite-only" doc
            await import("firebase/firestore").then(ns => ns.deleteDoc(oldDoc.ref));

        } else {
            // Create completely new profile if one doesn't exist
            await setDoc(doc(db, "users", uid), {
                uid,
                email,
                role: "PENDING", // Default role for unknown signups, requires Admin approval
                createdAt: new Date().toISOString()
            });
        }

        return credential;
    } catch (error) {
        console.error("Error signing up:", error);
        throw error;
    }
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<UserCredential> => {
    try {
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error logging in:", error);
        throw error;
    }
};

export const logout = async (): Promise<void> => {
    try {
        await signOut(auth);
        // Optional: Clear local storage or state
    } catch (error) {
        console.error("Error logging out:", error);
        throw error;
    }
};
