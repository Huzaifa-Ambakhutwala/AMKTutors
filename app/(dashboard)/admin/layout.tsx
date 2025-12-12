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
                    <div className="fixed inset-0 z-40 bg-gray-900 md:hidden pt-16">
                        <AdminSidebar
                            className="w-full h-full bg-gray-900 text-white flex flex-col"
                            onClose={() => setMobileMenuOpen(false)}
                        />
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
