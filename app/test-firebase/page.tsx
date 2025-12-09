"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, DocumentData } from "firebase/firestore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { loginWithEmailPassword, logout, signUpWithEmailPassword } from "@/lib/auth-helpers";

export default function TestFirebase() {
    const { user, loading } = useCurrentUser();
    const [docs, setDocs] = useState<DocumentData[]>([]);
    const [newDocText, setNewDocText] = useState("");
    const [status, setStatus] = useState("");

    const fetchDocs = async () => {
        try {
            // Using 'subjects' as it allows read for authenticated users per provided rules
            const querySnapshot = await getDocs(collection(db, "subjects"));
            const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setDocs(data);
        } catch (error: any) {
            console.error("Error fetching docs:", error);
            setStatus("Error fetching subjects: " + error.message);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const handleAddDoc = async () => {
        if (!newDocText) return;
        try {
            // This will fail unless the logged-in user has 'ADMIN' or 'TUTOR' role in 'users/{uid}'
            await addDoc(collection(db, "subjects"), {
                title: newDocText,
                createdAt: new Date().toISOString(),
                author: user ? user.email : "Anonymous"
            });
            setNewDocText("");
            setStatus("Subject added!");
            fetchDocs();
        } catch (error: any) {
            console.error("Error adding doc:", error);
            setStatus("Error adding subject: " + error.message);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Firebase Integration Test</h1>

            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h2 className="text-xl font-bold mb-4">Auth Status</h2>
                {loading ? (
                    <p>Loading user...</p>
                ) : user ? (
                    <div>
                        <p className="mb-2">Logged in as: <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-800">{user.email}</span></p>
                        <button
                            onClick={() => logout()}
                            className="bg-red-500 text-white px-4 py-2 rounded hovering:bg-red-600 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="mb-4">Not logged in.</p>
                        <div className="flex flex-col gap-3 max-w-sm">
                            <input
                                type="email"
                                placeholder="Email"
                                className="px-4 py-2 border rounded"
                                id="auth-email"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                className="px-4 py-2 border rounded"
                                id="auth-password"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const email = (document.getElementById('auth-email') as HTMLInputElement).value;
                                        const password = (document.getElementById('auth-password') as HTMLInputElement).value;
                                        try {
                                            await loginWithEmailPassword(email, password);
                                        } catch (e: any) {
                                            alert("Login failed: " + e.message);
                                        }
                                    }}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={async () => {
                                        const email = (document.getElementById('auth-email') as HTMLInputElement).value;
                                        const password = (document.getElementById('auth-password') as HTMLInputElement).value;
                                        try {
                                            await signUpWithEmailPassword(email, password);
                                        } catch (e: any) {
                                            alert("Signup failed: " + e.message);
                                        }
                                    }}
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1"
                                >
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h2 className="text-xl font-bold mb-4">Firestore Test (Subjects)</h2>
                <p className="mb-4 text-sm text-green-600">
                    <strong>Test Mode Active:</strong> Rules allow read/write for everyone.
                </p>

                <div className="flex gap-4 mb-4">
                    <input
                        type="text"
                        value={newDocText}
                        onChange={(e) => setNewDocText(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter subject title..."
                    />
                    <button
                        onClick={handleAddDoc}
                        className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Add Subject
                    </button>
                </div>

                {status && <p className="mb-4 text-sm font-semibold text-red-600">{status}</p>}

                <h3 className="font-bold mb-2">Collection: "subjects"</h3>
                {docs.length === 0 ? (
                    <p className="text-gray-500">No subjects found (or permission denied).</p>
                ) : (
                    <ul className="space-y-2">
                        {docs.map((doc: any) => (
                            <li key={doc.id} className="p-3 bg-white rounded shadow-sm border border-gray-100">
                                <span className="font-mono text-xs text-gray-400 block mb-1">ID: {doc.id}</span>
                                <p className="font-bold">{doc.title}</p>
                                <p className="text-xs text-gray-400 mt-1">Created: {doc.createdAt}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
