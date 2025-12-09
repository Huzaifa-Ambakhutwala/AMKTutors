"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    School,
    Calendar,
    CreditCard,
    Lock,
    LogOut,
    Home // Added Home icon
} from "lucide-react";
import Image from "next/image";
import { logout } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const links = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Students", href: "/admin/students", icon: GraduationCap },
        { name: "Parents", href: "/admin/parents", icon: School },
        { name: "Tutors", href: "/admin/tutors", icon: Users },
        { name: "Sessions", href: "/admin/sessions", icon: Calendar },
        { name: "Billing", href: "/admin/billing", icon: CreditCard },
        { name: "Manage Logins", href: "/admin/logins", icon: Lock },
        { name: "Back to Home", href: "/", icon: Home }, // Added Home link
    ];

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col hidden md:flex">
            <div className="p-6 flex items-center gap-3 border-b border-gray-800">
                <div className="bg-white p-1 rounded">
                    <Image src="/logo.png" alt="AMK" width={30} height={30} className="w-8 h-8 object-contain" />
                </div>
                <span className="font-bold font-heading text-lg tracking-wide">AMK ADMIN</span>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? "bg-primary text-white font-medium"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                        >
                            <Icon size={20} />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </div>
    );
}
