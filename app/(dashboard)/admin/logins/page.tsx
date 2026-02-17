"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { Loader2, Shield, Key, Trash2, Mail, Edit, Plus, Link as LinkIcon, Check } from "lucide-react";
import { getInviteLink } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { useIsMobile } from "@/hooks/useIsMobile";

// Google Calendar event colors (classic palette from Calendar API)
const GOOGLE_EVENT_COLORS: { id: string; name: string; bg: string }[] = [
    { id: "1", name: "Lavender", bg: "#A4BDFC" },
    { id: "2", name: "Sage", bg: "#7AE7BF" },
    { id: "3", name: "Grape", bg: "#DBADFF" },
    { id: "4", name: "Flamingo", bg: "#FF887C" },
    { id: "5", name: "Banana", bg: "#FBD75B" },
    { id: "6", name: "Tangerine", bg: "#FFB878" },
    { id: "7", name: "Peacock", bg: "#46D6DB" },
    { id: "8", name: "Graphite", bg: "#E1E1E1" },
    { id: "9", name: "Blueberry", bg: "#5484ED" },
    { id: "10", name: "Basil", bg: "#51B749" },
    { id: "11", name: "Tomato", bg: "#DC2127" },
];

export default function ManageLoginsPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
    const router = useRouter();
    const isMobile = useIsMobile();

    // Approval State
    const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const snap = await getDocs(collection(db, "users"));
            // Filter out Shadow Docs (Fix for Double Entry)
            const data = snap.docs
                .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
                .filter(u => !(u as any).isShadow);
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        const email = prompt("Enter new Admin's Email:");
        if (!email) return;
        const name = prompt("Enter Admin's Name:");
        if (!name) return;

        try {
            // Check if exists
            const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existing) {
                alert("User already exists!");
                return;
            }

            // Random ID
            const newId = uuidv4();
            const inviteToken = uuidv4();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await setDoc(doc(db, "users", newId), {
                uid: newId,
                name,
                email,
                role: 'ADMIN',
                status: 'invited',
                inviteToken: inviteToken,
                inviteExpiresAt: expiresAt.toISOString(),
                authUid: null,
                createdAt: new Date().toISOString(),
                isActive: true
            });

            fetchUsers();
            alert("Admin profile created! You can now copy their invite link.");
        } catch (e) {
            console.error(e);
            alert("Error creating admin");
        }
    };

    const handleCopyInvite = (user: UserProfile) => {
        if (user.status === 'registered') return;

        let token = user.inviteToken;
        if (!token) {
            alert("No invite token found. Please regenerate it.");
            return;
        }

        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedEmail(user.email);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Password reset email sent to ${email}`);
            } else {
                throw new Error(data.error || "Failed to send");
            }
        } catch (e: any) {
            console.error(e);
            alert("Error sending reset email: " + e.message);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure? This deletes their profile data.")) return;
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

    const handleSetCalendarColor = async (user: UserProfile, colorId: string) => {
        if (user.role !== 'TUTOR' && user.role !== 'ADMIN') return;
        const color = GOOGLE_EVENT_COLORS.find(c => c.id === colorId);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                calendarColorId: color ? colorId : null,
                calendarColorBg: color?.bg ?? null,
                calendarColorFg: color ? "#1d1d1d" : null,
            });
            setUsers(prev =>
                prev.map(u =>
                    u.uid === user.uid
                        ? {
                            ...u,
                            calendarColorId: color ? colorId : null,
                            calendarColorBg: color?.bg ?? null,
                            calendarColorFg: color ? "#1d1d1d" : null,
                        }
                        : u
                )
            );
        } catch (e) {
            console.error("Error setting calendar color:", e);
            alert("Failed to update calendar color");
        }
    };

    const renderMobileUserCard = (user: UserProfile, isPending: boolean = false) => (
        <div key={user.uid} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{user.name || "N/A"}</h3>
                    <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                    {!isPending && (
                        <p className="text-xs text-gray-400 font-mono">{user.uid.slice(0, 12)}...</p>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'TUTOR' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                }`}>
                    {user.role}
                </span>
            </div>
            
            {isPending ? (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        Joined: {new Date(user.createdAt || "").toLocaleDateString()}
                    </p>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
                        onChange={(e) => setSelectedRole({ ...selectedRole, [user.uid]: e.target.value })}
                        defaultValue=""
                    >
                        <option value="" disabled>Select Role...</option>
                        <option value="PARENT">Parent</option>
                        <option value="TUTOR">Tutor</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleApprove(user.uid)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors min-h-[48px]"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => handleDelete(user.uid)}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px]"
                        >
                            Reject
                        </button>
                </div>
                </div>
            ) : (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                    {user.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                            <Shield size={12} /> Registered
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                            <Mail size={12} /> Invited
                        </span>
                    )}
                    {/* Calendar color selector for mobile (Admins & Tutors) */}
                    {(user.role === 'ADMIN' || user.role === 'TUTOR') && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">Calendar color</p>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[44px] bg-white"
                                value={user.calendarColorId ?? ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value) {
                                        handleSetCalendarColor(user, value);
                                    } else {
                                        // Clear color: pass empty string, we treat as null
                                        handleSetCalendarColor(user, "");
                                    }
                                }}
                            >
                                <option value="">Default (no color)</option>
                                {GOOGLE_EVENT_COLORS.map(color => (
                                    <option key={color.id} value={color.id}>
                                        {color.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {user.status !== 'registered' && (
                            <button
                                onClick={() => handleCopyInvite(user)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
                            >
                                {copiedEmail === user.email ? <Check size={16} className="text-green-600" /> : <LinkIcon size={16} />}
                                {copiedEmail === user.email ? "Copied" : "Invite"}
                            </button>
                        )}
                        <button
                            onClick={() => handleResetPassword(user.email)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
                        >
                            <Key size={16} /> Reset
                        </button>
                        <button
                            onClick={() => handleEdit(user)}
                            className="flex-1 bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
                        >
                            <Edit size={16} /> Edit
                        </button>
                        <button 
                            onClick={() => handleDelete(user.uid)} 
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Manage Logins</h1>
                <button
                    onClick={handleAddAdmin}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-sm min-h-[48px] w-full md:w-auto"
                >
                    <Plus size={18} /> Add Admin
                </button>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl overflow-hidden p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                        <Shield size={20} /> Pending Approvals ({pendingUsers.length})
                    </h2>
                    {isMobile ? (
                        <div className="space-y-4">
                            {pendingUsers.map(user => renderMobileUserCard(user, true))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-orange-100 shadow-sm overflow-x-auto">
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
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-primary min-h-[48px]"
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
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-bold shadow-sm transition-colors min-h-[48px]"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.uid)}
                                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-bold transition-colors min-h-[48px]"
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
                    )}
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">Active Users</h2>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : isMobile ? (
                <div className="space-y-4">
                    {activeUsers.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No users found</p>
                        </div>
                    ) : (
                        activeUsers.map(user => renderMobileUserCard(user))
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">User</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Role</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Login Email</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Calendar Color</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {activeUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {user.name || "N/A"}
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{user.uid.slice(0, 8)}...</div>
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
                                            {(user.role === 'ADMIN' || user.role === 'TUTOR') ? (
                                                <div className="inline-flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{
                                                            backgroundColor:
                                                                GOOGLE_EVENT_COLORS.find(c => c.id === user.calendarColorId)?.bg ?? "transparent",
                                                        }}
                                                    />
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-primary bg-white min-h-[32px]"
                                                        value={user.calendarColorId ?? ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value) {
                                                                handleSetCalendarColor(user, value);
                                                            } else {
                                                                handleSetCalendarColor(user, "");
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Default</option>
                                                        {GOOGLE_EVENT_COLORS.map(color => (
                                                            <option key={color.id} value={color.id}>
                                                                {color.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'registered' ? (
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
                                            {user.status !== 'registered' && (
                                                <button
                                                    onClick={() => handleCopyInvite(user)}
                                                    className="text-gray-500 hover:text-green-600 tooltip flex items-center gap-1 text-sm font-medium min-h-[48px]"
                                                    title="Copy Invite Link"
                                                >
                                                    {copiedEmail === user.email ? <Check size={16} className="text-green-600" /> : <LinkIcon size={16} />}
                                                    {copiedEmail === user.email ? "Copied" : "Invite"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResetPassword(user.email)}
                                                className="text-gray-500 hover:text-blue-600 tooltip flex items-center gap-1 text-sm font-medium min-h-[48px]"
                                                title="Send Password Reset Email"
                                            >
                                                <Key size={16} /> Reset
                                            </button>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-gray-500 hover:text-blue-600 tooltip flex items-center gap-1 text-sm font-medium min-h-[48px]"
                                                title="Edit Profile"
                                            >
                                                <Edit size={16} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(user.uid)} className="text-gray-500 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center" title="Delete Account">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
