"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { Loader2, Shield, Key, Trash2, Mail, Edit } from "lucide-react";

export default function ManageLoginsPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    // Approval State
    const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const snap = await getDocs(collection(db, "users"));
            const data = snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try {
            // Using custom API route to send via Nodemailer (tutoring.amk@gmail.com)
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Password reset email sent to ${email} via tutoring.amk@gmail.com`);
            } else {
                throw new Error(data.error || "Failed to send");
            }
        } catch (e: any) {
            console.error(e);
            alert("Error sending reset email: " + e.message);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure? This deletes their profile data. (Note: It does not delete their Firebase Auth account automatically without Admin SDK)")) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            setUsers(users.filter(u => u.uid !== uid));
        } catch (e) {
            console.error(e);
            alert("Error deleting user");
        }
    };

    const handleApprove = async (uid: string) => {
        const roleToSet = selectedRole[uid];
        if (!roleToSet) {
            alert("Please select a role first");
            return;
        }
        try {
            await updateDoc(doc(db, "users", uid), {
                role: roleToSet
            });
            // Refresh local state
            setUsers(users.map(u => u.uid === uid ? { ...u, role: roleToSet as any } : u));
            alert("User approved!");
        } catch (e) {
            console.error(e);
            alert("Error approving user");
        }
    };

    const handleEdit = async (user: UserProfile) => {
        if (user.role === 'PARENT') {
            router.push(`/admin/parents/${user.uid}/edit`);
        } else if (user.role === 'TUTOR') {
            router.push(`/admin/tutors/${user.uid}/edit`);
        } else if (user.role === 'ADMIN') {
            const newName = prompt("Enter new name for Admin:", user.name || "");
            if (newName && newName !== user.name) {
                try {
                    await updateDoc(doc(db, "users", user.uid), { name: newName });
                    setUsers(users.map(u => u.uid === user.uid ? { ...u, name: newName } : u));
                } catch (e) {
                    console.error("Error updating admin name:", e);
                    alert("Failed to update name");
                }
            }
        }
    };

    const pendingUsers = users.filter(u => u.role === 'PENDING');
    const activeUsers = users.filter(u => u.role !== 'PENDING' && (
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ));

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-heading">Manage Logins</h1>
                <div className="bg-blue-50 text-blue-800 text-sm px-4 py-2 rounded-lg border border-blue-100 max-w-md">
                    <span className="font-bold block mb-1">Security Note:</span>
                    Passwords are encrypted and cannot be viewed. Use "Reset Password" to send a recovery link to the user.
                </div>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="mb-12 bg-orange-50 border border-orange-200 rounded-xl overflow-hidden p-6">
                    <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                        <Shield size={24} /> Pending Approvals ({pendingUsers.length})
                    </h2>
                    <div className="bg-white rounded-lg border border-orange-100 shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-orange-50/50 border-b border-orange-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-orange-900">Email</th>
                                    <th className="px-6 py-3 font-semibold text-orange-900">Date Joined</th>
                                    <th className="px-6 py-3 font-semibold text-orange-900">Assign Role</th>
                                    <th className="px-6 py-3 font-semibold text-orange-900">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.map(user => (
                                    <tr key={user.uid} className="hover:bg-orange-50/30">
                                        <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(user.createdAt || "").toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-primary"
                                                onChange={(e) => setSelectedRole({ ...selectedRole, [user.uid]: e.target.value })}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Select Role...</option>
                                                <option value="PARENT">Parent</option>
                                                <option value="TUTOR">Tutor</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(user.uid)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-bold shadow-sm transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.uid)}
                                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-bold transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Active Users</h2>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Role</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Login Email</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeUsers.map((user) => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {user.name || "N/A"}
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{user.uid}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${activeUsers.length > 0 && user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'TUTOR' ? 'bg-blue-100 text-blue-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        {user.uid.length > 20 ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                <Shield size={12} /> Registered
                                            </span>
                                        ) : (
                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                <Mail size={12} /> Invited
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="text-gray-500 hover:text-blue-600 tooltip flex items-center gap-1 text-sm font-medium"
                                            title="Edit Profile"
                                        >
                                            <Edit size={16} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleResetPassword(user.email)}
                                            className="text-gray-500 hover:text-blue-600 tooltip flex items-center gap-1 text-sm font-medium"
                                            title="Send Password Reset Email"
                                        >
                                            <Key size={16} /> Reset
                                        </button>
                                        {/* Edit Email could go here if implemented properly with Auth */}
                                        <button onClick={() => handleDelete(user.uid)} className="text-gray-500 hover:text-red-500" title="Delete Account">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
