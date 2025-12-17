"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DollarSign, BookOpen, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { Invoice, PayStub, Session, Student, UserProfile } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        monthlyRevenue: 0,
        monthlyRevenueChange: 0,
        totalSessions: 0,
        totalSessionsChange: 0,
        activeStudents: 0,
        activeStudentsChange: 0,
        conversionRate: 0,
        conversionRateChange: 0,
    });
    const [weeklySessions, setWeeklySessions] = useState<{ day: string; sessions: number }[]>([]);
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
    const [pendingPayStubs, setPendingPayStubs] = useState<PayStub[]>([]);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);
                
                // Fetch all necessary data
                const [invoicesSnap, sessionsSnap, studentsSnap, payStubsSnap, evaluationsSnap] = await Promise.all([
                    getDocs(collection(db, "invoices")),
                    getDocs(collection(db, "sessions")),
                    getDocs(collection(db, "students")),
                    getDocs(collection(db, "payStubs")),
                    getDocs(collection(db, "evaluations"))
                ]);

                const invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
                const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
                const payStubs = payStubsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PayStub));
                const evaluations = evaluationsSnap.docs.map(d => d.data());

                // Calculate Monthly Revenue
                const now = new Date();
                const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

                const currentMonthInvoices = invoices.filter(inv => {
                    const issueDate = new Date(inv.issueDate);
                    return issueDate >= currentMonthStart && inv.status === 'Paid';
                });
                const lastMonthInvoices = invoices.filter(inv => {
                    const issueDate = new Date(inv.issueDate);
                    return issueDate >= lastMonthStart && issueDate <= lastMonthEnd && inv.status === 'Paid';
                });

                const currentMonthRevenue = currentMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                const revenueChange = lastMonthRevenue > 0 
                    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
                    : 0;

                // Calculate Total Sessions
                const currentMonthSessions = sessions.filter(s => {
                    const startTime = new Date(s.startTime);
                    return startTime >= currentMonthStart;
                });
                const lastMonthSessions = sessions.filter(s => {
                    const startTime = new Date(s.startTime);
                    return startTime >= lastMonthStart && startTime <= lastMonthEnd;
                });
                const sessionsChange = lastMonthSessions.length > 0
                    ? ((currentMonthSessions.length - lastMonthSessions.length) / lastMonthSessions.length) * 100
                    : 0;

                // Calculate Active Students
                const activeStudents = students.filter(s => s.status === 'Active');
                const lastMonthActiveStudents = Math.max(activeStudents.length - 5, 0); // Placeholder for previous month
                const studentsChange = lastMonthActiveStudents > 0
                    ? ((activeStudents.length - lastMonthActiveStudents) / lastMonthActiveStudents) * 100
                    : 5; // Default positive if no previous data

                // Calculate Conversion Rate (Evaluations converted to students)
                const convertedEvaluations = evaluations.filter((e: any) => e.convertedToStudent === true);
                const totalEvaluations = evaluations.length;
                const conversionRate = totalEvaluations > 0 ? (convertedEvaluations.length / totalEvaluations) * 100 : 0;
                const conversionRateChange = -2; // Placeholder

                // Calculate Weekly Session Volume
                const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const weeklyData = weekDays.map(day => ({ day, sessions: 0 }));
                
                const today = new Date();
                const dayOfWeek = today.getDay();
                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                monday.setHours(0, 0, 0, 0);

                sessions.forEach(session => {
                    const sessionDate = new Date(session.startTime);
                    if (sessionDate >= monday && sessionDate <= today) {
                        const dayIndex = sessionDate.getDay();
                        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Monday = 0
                        if (adjustedIndex >= 0 && adjustedIndex < 7) {
                            weeklyData[adjustedIndex].sessions += 1;
                        }
                    }
                });

                // Get Recent Invoices (last 5, sorted by issue date)
                const sortedInvoices = [...invoices].sort((a, b) => 
                    new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
                );
                const recent = sortedInvoices.slice(0, 5);

                // Get Pending Pay Stubs (status = 'Draft')
                const pending = payStubs.filter(ps => ps.status === 'Draft').slice(0, 5);

                setStats({
                    monthlyRevenue: currentMonthRevenue,
                    monthlyRevenueChange: revenueChange,
                    totalSessions: sessions.length,
                    totalSessionsChange: sessionsChange,
                    activeStudents: activeStudents.length,
                    activeStudentsChange: studentsChange,
                    conversionRate: conversionRate,
                    conversionRateChange: conversionRateChange,
                });
                setWeeklySessions(weeklyData);
                setRecentInvoices(recent);
                setPendingPayStubs(pending);
            } catch (e) {
                console.error("Error loading dashboard data:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <RoleGuard allowedRoles={['ADMIN']}>
                <div className="p-8 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <h1 className="text-3xl font-bold font-heading mb-8">Admin Dashboard</h1>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        icon={DollarSign}
                        title="Monthly Revenue"
                        value={`$${stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        change={stats.monthlyRevenueChange}
                        color="bg-primary"
                    />
                    <KPICard
                        icon={BookOpen}
                        title="Total Sessions"
                        value={stats.totalSessions.toLocaleString()}
                        change={stats.totalSessionsChange}
                        color="bg-green-500"
                    />
                    <KPICard
                        icon={Users}
                        title="Active Students"
                        value={stats.activeStudents.toLocaleString()}
                        change={stats.activeStudentsChange}
                        color="bg-purple-500"
                    />
                    <KPICard
                        icon={TrendingUp}
                        title="Conversion Rate"
                        value={`${stats.conversionRate.toFixed(0)}%`}
                        change={stats.conversionRateChange}
                        color="bg-orange-500"
                    />
                </div>

                {/* Weekly Session Volume Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Weekly Session Volume</h2>
                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                            Preview
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklySessions}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="day" 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar 
                                dataKey="sessions" 
                                fill="#1A2742"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Invoices and Pending Pay Stubs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Invoices */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Recent Invoices</h2>
                        {recentInvoices.length === 0 ? (
                            <p className="text-gray-500 text-sm">No invoices yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentInvoices.map((invoice) => (
                                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                            <div className="text-sm text-gray-600">{invoice.parentName}</div>
                                            <div className="text-sm font-semibold text-gray-900 mt-1">
                                                ${invoice.totalAmount.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                invoice.status === 'Paid' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : invoice.status === 'Sent'
                                                    ? 'bg-[#1A2742]/10 text-primary'
                                                    : invoice.status === 'Overdue'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link 
                            href="/admin/billing"
                            className="mt-4 inline-block text-sm text-primary hover:text-accent font-medium"
                        >
                            View all invoices →
                            </Link>
                    </div>

                    {/* Pending Pay Stubs */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Pending Pay Stubs</h2>
                        {pendingPayStubs.length === 0 ? (
                            <p className="text-gray-500 text-sm">No pending pay stubs</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingPayStubs.map((stub) => {
                                    const periodStart = new Date(stub.periodStart);
                                    const periodEnd = new Date(stub.periodEnd);
                                    const periodStr = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                    
                                    return (
                                        <div key={stub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{stub.tutorName}</div>
                                                <div className="text-sm text-gray-600">{periodStr}</div>
                                                <div className="text-sm font-semibold text-gray-900 mt-1">
                                                    {stub.totalHours.toFixed(1)} Hours
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <Link
                                                    href={`/admin/billing?tab=tutors&tutorId=${stub.tutorId}`}
                                                    className="px-4 py-2 bg-primary hover:bg-accent text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Review
                            </Link>
                        </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <Link 
                            href="/admin/billing?tab=tutors"
                            className="mt-4 inline-block text-sm text-primary hover:text-accent font-medium"
                        >
                            View all pay stubs →
                        </Link>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

function KPICard({ icon: Icon, title, value, change, color }: {
    icon: any;
    title: string;
    value: string;
    change: number;
    color: string;
}) {
    const isPositive = change >= 0;
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
    const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className={`${color} p-3 rounded-lg text-white shadow-sm`}>
                    <Icon size={20} />
                </div>
                <div className={`flex items-center gap-1 ${changeColor}`}>
                    <ChangeIcon size={16} />
                    <span className="text-sm font-semibold">{Math.abs(change).toFixed(0)}%</span>
                </div>
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
