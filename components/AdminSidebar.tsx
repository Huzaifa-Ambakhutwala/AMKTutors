"use client";

import { useEffect, useState } from "react";
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
    BarChart3,
    FileText,
    ChevronDown,
    Bell,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
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
    const { logout: sessionLogout } = useAuth();

    const linksBeforePeople = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Calendar", href: "/admin/calendar", icon: CalendarDays },
    ];

    const peopleLinks = [
        { name: "Students", href: "/admin/students", icon: GraduationCap },
        { name: "Parents", href: "/admin/parents", icon: School },
        { name: "Tutors", href: "/admin/tutors", icon: Users },
    ];

    const sessionsEvaluationsLinks = [
        { name: "Sessions", href: "/admin/sessions", icon: Calendar },
        { name: "Evaluations", href: "/admin/evaluations", icon: ClipboardList },
    ];

    const analyticsReportsSettingsLinks = [
        { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
        { name: "Reports", href: "/admin/reports", icon: FileText },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    const singleLinksAfter = [
        { name: "Billing", href: "/admin/billing", icon: CreditCard },
        { name: "Notifications", href: "/admin/notifications", icon: Bell },
        { name: "Manage Logins", href: "/admin/logins", icon: Lock },
    ];

    const isPeopleActive = peopleLinks.some(
        (link) =>
            pathname === link.href ||
            (pathname.startsWith(link.href) && link.href !== "/admin")
    );
    const isSessionsEvaluationsActive = sessionsEvaluationsLinks.some(
        (link) =>
            pathname === link.href ||
            (pathname.startsWith(link.href) && link.href !== "/admin")
    );
    const isAnalyticsReportsSettingsActive =
        analyticsReportsSettingsLinks.some(
            (link) =>
                pathname === link.href ||
                (pathname.startsWith(link.href) && link.href !== "/admin")
        );

    const [peopleOpen, setPeopleOpen] = useState(isPeopleActive);
    const [sessionsOpen, setSessionsOpen] = useState(isSessionsEvaluationsActive);
    const [analyticsOpen, setAnalyticsOpen] = useState(
        isAnalyticsReportsSettingsActive
    );

    useEffect(() => {
        if (isPeopleActive) setPeopleOpen(true);
    }, [isPeopleActive]);
    useEffect(() => {
        if (isSessionsEvaluationsActive) setSessionsOpen(true);
    }, [isSessionsEvaluationsActive]);
    useEffect(() => {
        if (isAnalyticsReportsSettingsActive) setAnalyticsOpen(true);
    }, [isAnalyticsReportsSettingsActive]);

    const handleLogout = async () => {
        await sessionLogout();
        router.push("/login");
    };

    const handleLinkClick = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <SidebarBody
            className={cn("bg-gray-900 text-white h-screen", className)}
        >
            <div className="flex flex-col flex-1 overflow-y-auto h-full">
                {/* Logo Section */}
                <div
                    className={cn(
                        "flex items-center border-b border-gray-800 min-h-[80px]",
                        open ? "px-4 justify-start gap-3" : "px-0 justify-center"
                    )}
                >
                    <div className="bg-white p-1 rounded flex-shrink-0">
                        <Image
                            src="/logo.png"
                            alt="AMK"
                            width={30}
                            height={30}
                            className="w-8 h-8 object-contain"
                        />
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
                <nav
                    className={cn(
                        "flex-1 space-y-1",
                        open ? "px-2" : "px-0"
                    )}
                >
                    {linksBeforePeople.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            pathname === link.href ||
                            (pathname.startsWith(link.href) &&
                                link.href !== "/admin");

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

                    {/* People Dropdown (Students, Parents, Tutors) */}
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-3 w-full py-3 rounded-lg transition-colors text-base text-white hover:bg-gray-800",
                            open
                                ? "px-4 justify-between"
                                : "px-0 justify-center",
                            isPeopleActive ? "bg-primary font-medium" : ""
                        )}
                        onClick={() => setPeopleOpen((prev) => !prev)}
                    >
                        <div className="flex items-center gap-3">
                            <Users size={24} className="text-white" />
                            <motion.span
                                animate={{
                                    opacity: open ? 1 : 0,
                                    display: open ? "inline-block" : "none",
                                    width: open ? "auto" : 0,
                                }}
                                className="whitespace-pre overflow-hidden"
                            >
                                People
                            </motion.span>
                        </div>
                        {open && (
                            <motion.span
                                animate={{
                                    rotate: peopleOpen ? 180 : 0,
                                }}
                                className="flex-shrink-0"
                            >
                                <ChevronDown size={18} />
                            </motion.span>
                        )}
                    </button>
                    {peopleOpen && open && (
                        <div className="space-y-1 pl-10">
                            {peopleLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive =
                                    pathname === link.href ||
                                    pathname.startsWith(link.href);

                                return (
                                    <SidebarLink
                                        key={link.href}
                                        link={{
                                            label: link.name,
                                            href: link.href,
                                            icon: (
                                                <Icon
                                                    size={20}
                                                    className="text-white"
                                                />
                                            ),
                                        }}
                                        className={cn(
                                            "py-2 rounded-lg transition-colors text-sm w-full",
                                            "pr-4",
                                            isActive
                                                ? "bg-primary text-white font-medium"
                                                : "text-white hover:bg-gray-800"
                                        )}
                                        onClick={handleLinkClick}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Sessions & Evaluations Dropdown */}
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-3 w-full py-3 rounded-lg transition-colors text-base text-white hover:bg-gray-800",
                            open
                                ? "px-4 justify-between"
                                : "px-0 justify-center",
                            isSessionsEvaluationsActive
                                ? "bg-primary font-medium"
                                : ""
                        )}
                        onClick={() => setSessionsOpen((prev) => !prev)}
                    >
                        <div className="flex items-center gap-3">
                            <Calendar size={24} className="text-white" />
                            <motion.span
                                animate={{
                                    opacity: open ? 1 : 0,
                                    display: open ? "inline-block" : "none",
                                    width: open ? "auto" : 0,
                                }}
                                className="whitespace-pre overflow-hidden"
                            >
                                Sessions & Evaluations
                            </motion.span>
                        </div>
                        {open && (
                            <motion.span
                                animate={{
                                    rotate: sessionsOpen ? 180 : 0,
                                }}
                                className="flex-shrink-0"
                            >
                                <ChevronDown size={18} />
                            </motion.span>
                        )}
                    </button>
                    {sessionsOpen && open && (
                        <div className="space-y-1 pl-10">
                            {sessionsEvaluationsLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive =
                                    pathname === link.href ||
                                    pathname.startsWith(link.href);

                                return (
                                    <SidebarLink
                                        key={link.href}
                                        link={{
                                            label: link.name,
                                            href: link.href,
                                            icon: (
                                                <Icon
                                                    size={20}
                                                    className="text-white"
                                                />
                                            ),
                                        }}
                                        className={cn(
                                            "py-2 rounded-lg transition-colors text-sm w-full",
                                            "pr-4",
                                            isActive
                                                ? "bg-primary text-white font-medium"
                                                : "text-white hover:bg-gray-800"
                                        )}
                                        onClick={handleLinkClick}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Analytics, Reports & Settings Dropdown */}
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-3 w-full py-3 rounded-lg transition-colors text-base text-white hover:bg-gray-800",
                            open
                                ? "px-4 justify-between"
                                : "px-0 justify-center",
                            isAnalyticsReportsSettingsActive
                                ? "bg-primary font-medium"
                                : ""
                        )}
                        onClick={() => setAnalyticsOpen((prev) => !prev)}
                    >
                        <div className="flex items-center gap-3">
                            <BarChart3 size={24} className="text-white" />
                            <motion.span
                                animate={{
                                    opacity: open ? 1 : 0,
                                    display: open ? "inline-block" : "none",
                                    width: open ? "auto" : 0,
                                }}
                                className="whitespace-pre overflow-hidden"
                            >
                                Analytics & More
                            </motion.span>
                        </div>
                        {open && (
                            <motion.span
                                animate={{
                                    rotate: analyticsOpen ? 180 : 0,
                                }}
                                className="flex-shrink-0"
                            >
                                <ChevronDown size={18} />
                            </motion.span>
                        )}
                    </button>
                    {analyticsOpen && open && (
                        <div className="space-y-1 pl-10">
                            {analyticsReportsSettingsLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive =
                                    pathname === link.href ||
                                    pathname.startsWith(link.href);

                                return (
                                    <SidebarLink
                                        key={link.href}
                                        link={{
                                            label: link.name,
                                            href: link.href,
                                            icon: (
                                                <Icon
                                                    size={20}
                                                    className="text-white"
                                                />
                                            ),
                                        }}
                                        className={cn(
                                            "py-2 rounded-lg transition-colors text-sm w-full",
                                            "pr-4",
                                            isActive
                                                ? "bg-primary text-white font-medium"
                                                : "text-white hover:bg-gray-800"
                                        )}
                                        onClick={handleLinkClick}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {singleLinksAfter.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            pathname === link.href ||
                            (pathname.startsWith(link.href) &&
                                link.href !== "/admin");

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
                <div
                    className={cn(
                        "border-t border-gray-800 space-y-1",
                        open ? "p-2" : "p-0"
                    )}
                >
                    <SidebarLink
                        link={{
                            label: "Back to Website",
                            href: "/",
                            icon: (
                                <Home size={24} className="text-white" />
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
