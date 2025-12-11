"use client";

import { useState } from "react";
import { loginWithEmailPassword } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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
                    if (role === 'ADMIN') target = "/admin";
                    else if (role === 'TUTOR') target = "/tutor";
                    else if (role === 'PARENT') target = "/parent";
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center text-gray-600 hover:text-primary transition-colors font-medium">
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Website
                </Link>
            </div>
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
                <div>
                    <div className="flex justify-center mb-2">
                        <Image src="/logo.png" alt="AMK Tutors Logo" width={80} height={80} className="w-20 h-20 object-contain" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-heading">
                        Sign in to your account
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
                        </button>
                    </div>
                </form>


            </div>
        </div>
    );
}
