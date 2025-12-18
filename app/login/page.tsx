"use client";

import { useState } from "react";
import { loginWithEmailPassword } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, ArrowLeft, GraduationCap, Mail, Lock, Eye, EyeOff, Users, BookOpen, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const credential = await loginWithEmailPassword(email, password);
            const uid = credential.user.uid;

            // Fetch User Role to Redirect Directly
            let target = "/";
            try {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role;
                    if (role === "ADMIN") target = "/admin";
                    else if (role === "TUTOR") target = "/tutor";
                    else if (role === "PARENT") target = "/parent";
                }
            } catch (roleError) {
                console.error("Error fetching role for redirect:", roleError);
            }

            // Redirect
            router.push(target);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

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

                                {/* Remember / Forgot */}
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 text-gray-600">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                                        />
                                        <span>Remember me</span>
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
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
