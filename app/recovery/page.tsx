"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

export default function RecoveryPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg("");

        try {
            // 1. Create Auth User
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;

            // 2. Create Admin Profile (Rules relaxed to allow this)
            await setDoc(doc(db, "users", uid), {
                uid: uid,
                name: "Recovery Admin",
                email: email,
                role: 'ADMIN',
                createdAt: new Date().toISOString(),
                isActive: true
            });

            setMsg("Success! Redirecting...");
            setTimeout(() => router.push('/admin/dashboard'), 1500);

        } catch (e: any) {
            console.error(e);
            setMsg("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-50">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-red-200">
                <div className="flex justify-center mb-4 text-red-600">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="text-2xl font-bold text-center mb-2 text-red-900">Emergency Admin Recovery</h1>
                <p className="text-center text-gray-600 mb-6 text-sm">Create a new Admin account to regain access.</p>

                <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">New Admin Email</label>
                        <input
                            className="w-full border p-2 rounded"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            className="w-full border p-2 rounded"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {msg && (
                        <div className={`p-2 rounded text-sm text-center ${msg.includes("Success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {msg}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Create Admin Account"}
                    </button>
                </form>
            </div>
        </div>
    );
}
