"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { logout } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";
import { useScrollspy } from "@/lib/motion/useScrollspy";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, role } = useUserRole();
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);
    
    // Navbar shrink on scroll
    useEffect(() => {
        const unsubscribe = scrollY.on("change", (latest) => {
            setIsScrolled(latest > 20);
        });
        return () => unsubscribe();
    }, [scrollY]);
    
    // Scrollspy for active section
    const sectionIds = ["home", "about", "subjects", "curriculum", "testimonials", "contact"];
    const activeSection = useScrollspy({ sectionIds });

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
        { name: "About", href: "#about", id: "about" },
        { name: "Subjects", href: "#subjects", id: "subjects" },
        { name: "Curriculum", href: "#curriculum", id: "curriculum" },
        { name: "Testimonials", href: "#testimonials", id: "testimonials" },
    ];


    return (
        <motion.nav
            className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100"
            initial={{ height: 64 }}
            animate={{
                height: isScrolled ? 56 : 64,
                backdropFilter: isScrolled ? "blur(12px)" : "blur(8px)",
            }}
            transition={{ duration: 0.2 }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <motion.div
                                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Image src="/logo.png" alt="AMK Tutors Logo" width={150} height={50} className="h-20 w-auto object-contain drop-shadow-sm" loading="eager" priority />
                            </motion.div>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => {
                            const isActive = activeSection === link.id;
                            return (
                            <Link
                                    key={link.href}
                                href={link.href}
                                    className="relative text-gray-700 hover:text-primary transition-colors font-medium px-2 py-1"
                            >
                                {link.name}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                            </Link>
                            );
                        })}
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
                                className="bg-yellow-300 text-secondary px-5 py-2 rounded-full font-semibold hover:bg-yellow-400 transition-colors shadow-sm hover:shadow-md"
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
                <motion.div
                    className="md:hidden bg-white border-b border-gray-100 shadow-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                >
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
                                className="block w-full text-center px-3 py-2 bg-yellow-300 text-secondary font-semibold rounded-md hover:bg-yellow-400"
                                onClick={() => setIsOpen(false)}
                            >
                                Book Consultation
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}

