"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase"; // Ensure auth is exported from here
import { UserProfile } from "@/lib/types";
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function InvitePage() {
    const { token } = useParams();
    const router = useRouter();
    const inviteToken = Array.isArray(token) ? token[0] : token;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userDoc, setUserDoc] = useState<UserProfile & { id: string } | null>(null);

    // Form
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!inviteToken) return;
        verifyToken();
    }, [inviteToken]);

    const verifyToken = async () => {
        try {
            const q = query(collection(db, "users"), where("inviteToken", "==", inviteToken));
            const snap = await getDocs(q);

            if (snap.empty) {
                setError("Invalid invitation link.");
                setLoading(false);
                return;
            }

            const docData = snap.docs[0].data() as UserProfile;
            const docId = snap.docs[0].id;

            // Check Status
            if (docData.status === 'registered') {
                setError("This account is already registered. Please log in.");
                setLoading(false);
                return;
            }

            // Check Expiry
            if (docData.inviteExpiresAt && new Date(docData.inviteExpiresAt) < new Date()) {
                setError("This invitation has expired.");
                setLoading(false);
                return;
            }

            setUserDoc({ ...docData, id: docId });
        } catch (e) {
            console.error(e);
            setError("Error verifying invitation.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userDoc) return;

        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);

        try {
            // 1. Create Auth User
            const credential = await createUserWithEmailAndPassword(auth, userDoc.email, password);
            const authUid = credential.user.uid;

            // 2. Update Firestore Doc
            await updateDoc(doc(db, "users", userDoc.id), {
                authUid: authUid,
                status: 'registered',
                inviteToken: null,
                inviteExpiresAt: null,
                registeredAt: new Date().toISOString(),
                isActive: true // Activate if not already
            });

            // 3. Login (Auto-logged in by createUser, but good to be sure)
            // Redirect based on role
            if (userDoc.role === 'ADMIN') router.push('/admin/dashboard');
            else if (userDoc.role === 'TUTOR') router.push('/tutor');
            else if (userDoc.role === 'PARENT') router.push('/parent');
            else router.push('/login'); // Fallback

        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/email-already-in-use') {
                setError("Email is already in use. Please log in instead.");
            } else {
                setError("Error creating account: " + e.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-100">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="text-red-600" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Welcome, {userDoc?.name}!</h1>
                    <p className="text-gray-500 text-sm mt-2">Complete your account setup to get started.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Verified)</label>
                        <input
                            type="email"
                            value={userDoc?.email}
                            disabled
                            className="w-full px-4 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg font-medium cursor-not-allowed"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-10"
                            placeholder="Min. 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            placeholder="Re-enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                        {submitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                    </button>
                </form>
            </div>
        </div>
    );
}
