"use client";

import RoleGuard from "@/components/RoleGuard";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, BookOpen, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { fetchDashboardSummary } from "@/lib/dashboard-stats";
import FirestoreErrorBanner from "@/components/FirestoreErrorBanner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const stats = data ?? {
    monthlyRevenue: 0,
    monthlyRevenueChange: 0,
    totalSessions: 0,
    totalSessionsChange: 0,
    activeStudents: 0,
    activeStudentsChange: 0,
    conversionRate: 0,
    conversionRateChange: 0,
    weeklySessions: [],
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="w-full max-w-full overflow-x-hidden">
        <h1 className="text-2xl md:text-3xl font-bold font-heading mb-6 md:mb-8">
          Admin Dashboard
        </h1>

        <FirestoreErrorBanner error={error} onRetry={() => refetch()} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <KPICard
            icon={DollarSign}
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={stats.monthlyRevenueChange}
            color="bg-primary"
          />
          <KPICard
            icon={BookOpen}
            title="Sessions This Month"
            value={stats.totalSessions.toLocaleString()}
            change={stats.totalSessionsChange}
            color="bg-green-500"
            href="/admin/sessions"
          />
          <KPICard
            icon={Users}
            title="Active Students"
            value={stats.activeStudents.toLocaleString()}
            change={stats.activeStudentsChange}
            color="bg-purple-500"
            href="/admin/students"
          />
          <KPICard
            icon={TrendingUp}
            title="Conversion Rate"
            value={`${stats.conversionRate.toFixed(0)}%`}
            change={stats.conversionRateChange}
            color="bg-orange-500"
            href="/admin/evaluations"
          />
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-lg md:text-xl font-bold">Weekly Session Volume</h2>
            <Link
              href="/admin/calendar"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors min-h-[48px] w-full md:w-auto text-center"
            >
              Open calendar
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.weeklySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="sessions" fill="#1A2742" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/sessions"
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <h2 className="font-bold text-lg mb-1">Sessions</h2>
            <p className="text-sm text-gray-500">View today, this week, or history</p>
          </Link>
          <Link
            href="/admin/calendar"
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <h2 className="font-bold text-lg mb-1">Calendar</h2>
            <p className="text-sm text-gray-500">Month view of scheduled sessions</p>
          </Link>
        </div>
      </div>
    </RoleGuard>
  );
}

function KPICard({
  icon: Icon,
  title,
  value,
  change,
  color,
  href = "#",
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string;
  change: number;
  color: string;
  href?: string;
}) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? "text-green-600" : "text-red-600";
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Link
      href={href}
      className="block bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-h-[140px]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} p-3 rounded-lg text-white shadow-sm`}>
          <Icon size={20} />
        </div>
        {change !== 0 && (
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <ChangeIcon size={16} />
            <span className="text-sm font-semibold">{Math.abs(change).toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </Link>
  );
}
