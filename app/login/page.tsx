"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, GraduationCap, Mail, Lock, Eye, EyeOff, Users, BookOpen, Award } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { signInWithEmailAndPassword, signInWithPopup, linkWithCredential, OAuthCredential } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { withFirestoreTimeout, firestoreErrorMessage } from "@/lib/firestore-safe";
import { createAppSessionFromIdToken } from "@/lib/auth-session-client";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const { user, loading: authLoading, refetch } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl") ?? "";

    // Account linking: existing email/password user signed in with Google
    const [linkModal, setLinkModal] = useState<{ email: string; credential: OAuthCredential } | null>(null);
    const [linkPassword, setLinkPassword] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkError, setLinkError] = useState("");

    useEffect(() => {
        if (authLoading) return;
        if (user) {
            const target = returnUrl && returnUrl.startsWith("/") ? decodeURIComponent(returnUrl) : (user.role === "ADMIN" ? "/admin" : user.role === "TUTOR" ? "/tutor" : "/parent");
            router.replace(target);
        }
    }, [user, authLoading, returnUrl, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    rememberMe,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Invalid email or password");
                return;
            }

            // Sign in the Firebase client so Firestore requests are authenticated (required for production)
            try {
                await withFirestoreTimeout(
                    signInWithEmailAndPassword(auth, email.trim(), password),
                    15000
                );
            } catch (firebaseErr: unknown) {
                console.error("Firebase client sign-in:", firebaseErr);
                const err = firebaseErr as { name?: string; code?: string; message?: string };
                if (err?.name === "FirestoreSafeError" || err?.code === "FIRESTORE_QUOTA_EXCEEDED") {
                    setError(firestoreErrorMessage(firebaseErr));
                } else {
                    setError("Login succeeded but could not connect to data. Please refresh and try again.");
                }
                return;
            }

            await refetch();
            const target = returnUrl && returnUrl.startsWith("/") ? decodeURIComponent(returnUrl) : (data.redirectTo || "/admin");
            router.push(target);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        setLinkModal(null);
        try {
            const result = await withFirestoreTimeout(signInWithPopup(auth, googleProvider), 60000);
            const idToken = await result.user.getIdToken(true);
            const data = await withFirestoreTimeout(
                createAppSessionFromIdToken(idToken, rememberMe),
                15000
            );
            await refetch();
            const target = returnUrl && returnUrl.startsWith("/") ? decodeURIComponent(returnUrl) : (data.redirectTo || "/admin");
            router.push(target);
        } catch (err: any) {
            const code = err?.code ?? "";
            if (code === "auth/account-exists-with-different-credential") {
                const existingEmail = (err?.customData as { email?: string })?.email ?? err?.email ?? "";
                const credential = err.credential as OAuthCredential | undefined;
                if (credential) {
                    setLinkModal({ email: existingEmail, credential });
                    setLinkPassword("");
                    setLinkError("");
                } else {
                    setError("This email is already registered. Please sign in with your password first.");
                }
            } else if (code === "auth/popup-closed-by-user") {
                setError("");
            } else if (code === "auth/credential-already-in-use") {
                setError("This Google account is already linked to another user.");
            } else if (err?.code === "PENDING") {
                setError(err.message ?? "Account is pending approval. Please contact an administrator.");
            } else if (err?.code === "FIRESTORE_QUOTA_EXCEEDED") {
                setError(err.message ?? "Database quota exceeded. Check Firebase billing or try again later.");
            } else if (err?.name === "FirestoreSafeError") {
                setError(firestoreErrorMessage(err));
            } else if (err?.code === "NOT_IN_DB") {
                setError(err.message ?? "No account found for this email. Please contact an administrator or use an invite link.");
            } else {
                setError(err?.message ?? "Google sign-in failed. Try again or use email/password.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLinkWithPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkModal) return;
        setLinkLoading(true);
        setLinkError("");
        try {
            const userCred = await signInWithEmailAndPassword(auth, linkModal.email, linkPassword);
            await linkWithCredential(userCred.user, linkModal.credential);
            const idToken = await userCred.user.getIdToken(true);
            const data = await createAppSessionFromIdToken(idToken, rememberMe);
            await refetch();
            setLinkModal(null);
            const target = returnUrl && returnUrl.startsWith("/") ? decodeURIComponent(returnUrl) : (data.redirectTo || "/admin");
            router.push(target);
        } catch (err: any) {
            if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
                setLinkError("Wrong password. Please try again.");
            } else {
                setLinkError(err?.message ?? "Linking failed. Please try again.");
            }
        } finally {
            setLinkLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-secondary via-secondary/95 to-secondary">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-300" />
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-secondary via-secondary/95 to-secondary relative overflow-hidden">
            {/* Decorative blobs */}
            <motion.div
                className="pointer-events-none absolute -left-32 -top-32 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            />
            <motion.div
                className="pointer-events-none absolute -right-24 -bottom-24 w-[28rem] h-[28rem] bg-yellow-200/25 rounded-full blur-3xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            />

            {/* Back link */}
            <div className="absolute top-6 left-6 z-20">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-yellow-300 hover:text-white transition-colors"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Website
                </Link>
            </div>

            <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-10 relative z-10">
                <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    {/* Left panel - branding & features */}
                    <motion.div
                        className="hidden lg:flex flex-col justify-between h-full text-white pr-4"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-white rounded-xl shadow-lg px-3 py-2">
                                <Image
                                    src="/logo.png"
                                    alt="AMK Tutors Logo"
                                    width={120}
                                    height={48}
                                    className="h-12 w-auto object-contain"
                                />
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-4xl font-bold mb-4 leading-tight">
                                    Welcome to Your
                                    <br />
                                    Learning Journey
                                </h2>
                                <p className="text-yellow-100 text-lg">
                                    Join students achieving academic excellence with personalized tutoring and clear
                                    progress tracking.
                                </p>
                            </div>

                            {/* Feature cards */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-yellow-300 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="w-5 h-5 text-secondary" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold text-lg mb-1">Expert Tutors</h3>
                                            <p className="text-yellow-100 text-sm">
                                                Learn from qualified educators with proven track records.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-yellow-300 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Users className="w-5 h-5 text-secondary" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold text-lg mb-1">Personalized Plans</h3>
                                            <p className="text-yellow-100 text-sm">
                                                Customized learning paths tailored to each student&apos;s needs.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-yellow-300 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Award className="w-5 h-5 text-secondary" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold text-lg mb-1">Proven Results</h3>
                                            <p className="text-yellow-100 text-sm">
                                                Track improvements across sessions with clear reports.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer stats */}
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/20 mt-6">
                            <div>
                                <div className="text-3xl font-bold text-yellow-300">14+</div>
                                <div className="text-yellow-100 text-sm">Students</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-yellow-300">4+</div>
                                <div className="text-yellow-100 text-sm">Tutors</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-yellow-300">95%</div>
                                <div className="text-yellow-100 text-sm">Success Rate</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right panel - login form */}
                    <motion.div
                        className="w-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {/* Mobile logo */}
                        <div className="lg:hidden flex items-center gap-3 mb-8 text-white">
                            <div className="w-12 h-12 bg-yellow-300 rounded-xl flex items-center justify-center shadow-lg">
                                <GraduationCap className="w-7 h-7 text-secondary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">AMK Tutors</h1>
                                <p className="text-yellow-200 text-sm">Excellence in Education</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-md ml-auto">
                            <div className="mb-6">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                                <p className="text-gray-600">
                                    Sign in to access your dashboard as an{" "}
                                    <span className="font-semibold text-secondary">Admin</span>,{" "}
                                    <span className="font-semibold text-secondary">Tutor</span>, or{" "}
                                    <span className="font-semibold text-secondary">Parent</span>.
                                </p>
                            </div>

                            {/* Sign in with Google */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-60 transition-all mb-5"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        Sign in with Google
                                    </>
                                )}
                            </button>

                            <div className="relative mb-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or continue with email</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-red-700 text-sm rounded-md">
                                        {error}
                                    </div>
                                )}

                                {/* Email */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail
                                                className={`h-5 w-5 transition-colors ${
                                                    emailFocused ? "text-secondary" : "text-gray-400"
                                                }`}
                                            />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setEmailFocused(true)}
                                            onBlur={() => setEmailFocused(false)}
                                            className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
                                                emailFocused
                                                    ? "border-secondary ring-2 ring-yellow-300/40"
                                                    : "border-gray-300"
                                            } bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock
                                                className={`h-5 w-5 transition-colors ${
                                                    passwordFocused ? "text-secondary" : "text-gray-400"
                                                }`}
                                            />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
                                                passwordFocused
                                                    ? "border-secondary ring-2 ring-yellow-300/40"
                                                    : "border-gray-300"
                                            } bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="Enter your password"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Keep me signed in / Forgot */}
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                                        />
                                        <span>Keep me signed in</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="font-medium text-secondary hover:text-secondary/80 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-full text-sm font-semibold text-secondary bg-yellow-300 shadow-lg shadow-yellow-300/40 hover:bg-yellow-300/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-300 disabled:opacity-60 transition-transform transform hover:-translate-y-0.5"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin h-4 w-4" />
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign in"
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    Having trouble signing in?{" "}
                                    <a
                                        href="mailto:contact@amktutors.com"
                                        className="font-medium text-secondary hover:text-secondary/80"
                                    >
                                        Contact support
                                    </a>
                                </p>
                            </form>

                            {/* Modal: Link Google to existing account */}
                            {linkModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Link Google account</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            This email is already registered. Enter your password to link your Google account. You can then sign in with either method.
                                        </p>
                                        <p className="text-sm font-medium text-gray-700 mb-2">{linkModal.email}</p>
                                        <form onSubmit={handleLinkWithPassword} className="space-y-4">
                                            <div>
                                                <label htmlFor="link-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                                <input
                                                    id="link-password"
                                                    type="password"
                                                    value={linkPassword}
                                                    onChange={(e) => setLinkPassword(e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                                                    placeholder="Your password"
                                                    required
                                                    minLength={6}
                                                    autoFocus
                                                />
                                            </div>
                                            {linkError && (
                                                <div className="text-sm text-red-600">{linkError}</div>
                                            )}
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { setLinkModal(null); setLinkError(""); }}
                                                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={linkLoading}
                                                    className="flex-1 py-2.5 px-4 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                                                >
                                                    {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link & sign in"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-secondary via-secondary/95 to-secondary">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-300" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
