"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    School,
    Calendar,
    CalendarDays,
    CreditCard,
    Lock,
    LogOut,
    Home,
    ClipboardList,
    Settings,
} from "lucide-react";
import Image from "next/image";
import { logout } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";
import { SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
    onClose?: () => void;
    className?: string;
}

export default function AdminSidebar({ onClose, className }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { open } = useSidebar();

    const links = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Calendar", href: "/admin/calendar", icon: CalendarDays },
        { name: "Students", href: "/admin/students", icon: GraduationCap },
        { name: "Parents", href: "/admin/parents", icon: School },
        { name: "Tutors", href: "/admin/tutors", icon: Users },
        { name: "Sessions", href: "/admin/sessions", icon: Calendar },
        { name: "Evaluations", href: "/admin/evaluations", icon: ClipboardList },
        { name: "Billing", href: "/admin/billing", icon: CreditCard },
        { name: "Settings", href: "/admin/settings", icon: Settings },
        { name: "Manage Logins", href: "/admin/logins", icon: Lock },
    ];

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const handleLinkClick = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <SidebarBody className={cn(
            "bg-gray-900 text-white h-screen",
            className
        )}>
                <div className="flex flex-col flex-1 overflow-y-auto h-full">
                    {/* Logo Section */}
                    <div className={cn(
                        "flex items-center border-b border-gray-800 min-h-[80px]",
                        open ? "px-4 justify-start gap-3" : "px-0 justify-center"
                    )}>
                        <div className="bg-white p-1 rounded flex-shrink-0">
                            <Image src="/logo.png" alt="AMK" width={30} height={30} className="w-8 h-8 object-contain" />
                        </div>
                        <motion.span
                            animate={{
                                opacity: open ? 1 : 0,
                                width: open ? "auto" : 0,
                                display: open ? "block" : "none",
                            }}
                            className="font-bold font-heading text-lg tracking-wide whitespace-pre overflow-hidden"
                        >
                            AMK ADMIN
                        </motion.span>
                    </div>

                    {/* Navigation Links */}
                    <nav className={cn(
                        "flex-1 space-y-1",
                        open ? "px-2" : "px-0"
                    )}>
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");

                            return (
                                <SidebarLink
                                    key={link.href}
                                    link={{
                                        label: link.name,
                                        href: link.href,
                                        icon: (
                                            <Icon 
                                                size={24} 
                                                className="text-white"
                                            />
                                        ),
                                    }}
                                    className={cn(
                                        "py-3 rounded-lg transition-colors text-base w-full",
                                        open ? "px-4" : "px-0 justify-center",
                                        isActive
                                            ? "bg-primary text-white font-medium"
                                            : "text-white hover:bg-gray-800"
                                    )}
                                    onClick={handleLinkClick}
                                />
                            );
                        })}
                    </nav>

                    {/* Footer Links */}
                    <div className={cn(
                        "border-t border-gray-800 space-y-1",
                        open ? "p-2" : "p-0"
                    )}>
                        <SidebarLink
                            link={{
                                label: "Back to Website",
                                href: "/",
                                icon: (
                                    <Home 
                                        size={24} 
                                        className="text-white"
                                    />
                                ),
                            }}
                            className={cn(
                                "py-3 w-full text-white hover:bg-gray-800 rounded-lg transition-colors text-base",
                                open ? "px-4" : "px-0 justify-center"
                            )}
                            onClick={handleLinkClick}
                        />
                        <button
                            onClick={handleLogout}
                            className={cn(
                                "flex items-center gap-3 py-3 w-full rounded-lg transition-colors text-base text-white hover:text-red-400 hover:bg-gray-800",
                                open ? "justify-start px-4" : "justify-center px-0"
                            )}
                        >
                            <LogOut size={24} className="flex-shrink-0" />
                            <motion.span
                                animate={{
                                    opacity: open ? 1 : 0,
                                    display: open ? "inline-block" : "none",
                                    width: open ? "auto" : 0,
                                }}
                                className="whitespace-pre overflow-hidden"
                            >
                                Logout
                            </motion.span>
                        </button>
                    </div>
                </div>
            </SidebarBody>
    );
}
