"use client";

import AdminSidebar from "@/components/AdminSidebar";
import RoleGuard from "@/components/RoleGuard";
import { Sidebar } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function MainContent({ children }: { children: React.ReactNode }) {
    const { open } = useSidebar();
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(min-width: 768px)");
        const handler = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsDesktop(event.matches);
        };

        // Set initial value
        handler(mediaQuery);

        // Listen for changes
        const listener = (event: MediaQueryListEvent) => handler(event);
        mediaQuery.addEventListener("change", listener);

        return () => {
            mediaQuery.removeEventListener("change", listener);
        };
    }, []);

    return (
        <motion.main
            className="flex-1 min-h-screen transition-all duration-300 w-full pt-14 md:pt-0"
            animate={{
                marginLeft: isDesktop ? (open ? "300px" : "64px") : "0px",
            }}
        >
            <div className="p-6">
                {children}
            </div>
        </motion.main>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
                <div className="min-h-screen bg-gray-50 flex">
                    {/* Sidebar - handles both desktop and mobile */}
                    <AdminSidebar onClose={() => setSidebarOpen(false)} />

                    {/* Main Content Area */}
                    <MainContent>
                        {children}
                    </MainContent>
                </div>
            </Sidebar>
        </RoleGuard>
    );
}
