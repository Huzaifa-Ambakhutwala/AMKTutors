"use client";

import AdminSidebar from "@/components/AdminSidebar";
import RoleGuard from "@/components/RoleGuard";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="min-h-screen bg-gray-50 flex">
                {/* Desktop Sidebar */}
                <AdminSidebar />

                {/* Mobile Header */}
                <div className="md:hidden fixed top-0 w-full bg-gray-900 text-white z-50 flex items-center justify-between p-4">
                    <span className="font-bold">AMK ADMIN</span>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu />
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-95 md:hidden pt-20 p-4">
                        {/* Re-using simple links for mobile for now, ideally re-use sidebar logic */}
                        <nav className="space-y-4">
                            <a href="/admin" className="block text-white text-lg py-2 border-b border-gray-700">Dashboard</a>
                            <a href="/admin/students" className="block text-white text-lg py-2 border-b border-gray-700">Students</a>
                            <a href="/admin/parents" className="block text-white text-lg py-2 border-b border-gray-700">Parents</a>
                            <a href="/admin/tutors" className="block text-white text-lg py-2 border-b border-gray-700">Tutors</a>
                            <a href="/admin/sessions" className="block text-white text-lg py-2 border-b border-gray-700">Sessions</a>
                        </nav>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
                    {children}
                </main>
            </div>
        </RoleGuard>
    );
}
