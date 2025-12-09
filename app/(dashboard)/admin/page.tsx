"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Make sure to export db
import { Users, GraduationCap, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        students: 0,
        tutors: 0,
        sessions: 0,
        unpaidInvoices: 0
    });

    useEffect(() => {
        // In a real app, you might want to create aggregate counters or use server-side counting
        // as reading all docs can be expensive. For MVP/Internal tool, this is fine.
        async function fetchStats() {
            try {
                const studentsSnap = await getDocs(collection(db, "students"));
                const sessionsSnap = await getDocs(collection(db, "sessions"));
                // For tutors we need to query users where role == TUTOR. 
                // NOTE: Firestore requires an index for this. If it fails, check console for index creation link.
                // For now, let's just count all users unless we want to filter manually client-side (easier for MVP without indexes)
                const usersSnap = await getDocs(collection(db, "users"));
                const tutorsCount = usersSnap.docs.filter(d => d.data().role === 'TUTOR').length;

                // Invoices not implemented yet, placeholder
                setStats({
                    students: studentsSnap.size,
                    tutors: tutorsCount,
                    sessions: sessionsSnap.size,
                    unpaidInvoices: 0
                });
            } catch (e) {
                console.error("Error loading stats:", e);
            }
        }
        fetchStats();
    }, []);

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <h1 className="text-3xl font-bold font-heading mb-8">Admin Dashboard</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard icon={GraduationCap} title="Active Students" value={stats.students} color="bg-blue-500" />
                    <StatCard icon={Users} title="Active Tutors" value={stats.tutors} color="bg-purple-500" />
                    <StatCard icon={Calendar} title="Total Sessions" value={stats.sessions} color="bg-green-500" />
                    <StatCard icon={DollarSign} title="Unpaid Invoices" value={stats.unpaidInvoices} color="bg-red-500" />
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/admin/students/new" className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded text-blue-600 font-medium transition-colors text-center border border-gray-200">
                                + Add New Student
                            </Link>
                            <Link href="/admin/tutors/new" className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded text-blue-600 font-medium transition-colors text-center border border-gray-200">
                                + Add New Tutor
                            </Link>
                            <Link href="/admin/billing" className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded text-blue-600 font-medium transition-colors text-center border border-gray-200">
                                Manage Invoices
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

function StatCard({ icon: Icon, title, value, color }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className={`${color} p-4 rounded-full text-white mr-4 shadow-md`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
