"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { logout } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, role } = useUserRole();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/");
        setIsOpen(false);
    };

    const getDashboardLink = () => {
        if (!role) return "/";
        if (role === 'ADMIN') return "/admin";
        if (role === 'TUTOR') return "/tutor";
        if (role === 'PARENT') return "/parent";
        return "/";
    };

    const navLinks = [
        { name: "About", href: "#about" },
        { name: "Subjects", href: "#subjects" },
        { name: "Curriculum", href: "#curriculum" },
        { name: "Testimonials", href: "#testimonials" },
    ];

    return (
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/logo.png" alt="AMK Tutors Logo" width={50} height={50} className="w-12 h-12 object-contain" />
                            {/* <span className="text-2xl font-bold text-primary font-heading">AMK Tutors</span> */}
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-gray-700 hover:text-primary transition-colors font-medium"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex items-center space-x-4">
                            {user ? (
                                <>
                                    <Link
                                        href={getDashboardLink()}
                                        className="text-gray-700 hover:text-primary transition-colors font-medium flex items-center gap-1"
                                    >
                                        <User size={18} />
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="text-gray-500 hover:text-red-500 transition-colors font-medium text-sm"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="text-primary font-semibold hover:text-accent transition-colors"
                                >
                                    Login
                                </Link>
                            )}
                            <Link
                                href="#contact"
                                className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-semibold hover:bg-accent transition-colors shadow-sm hover:shadow-md"
                            >
                                Book Consultation
                            </Link>
                        </div>
                    </div>

                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-700 hover:text-primary focus:outline-none"
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-4 space-y-3">
                            {user ? (
                                <>
                                    <Link
                                        href={getDashboardLink()}
                                        className="block w-full text-center px-3 py-2 text-gray-700 font-semibold border border-gray-200 rounded-md hover:bg-gray-50"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-center px-3 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-md"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="block w-full text-center px-3 py-2 text-primary font-semibold border border-primary/20 rounded-md hover:bg-primary/5"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Login
                                </Link>
                            )}
                            <Link
                                href="#contact"
                                className="block w-full text-center px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-accent"
                                onClick={() => setIsOpen(false)}
                            >
                                Book Consultation
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
