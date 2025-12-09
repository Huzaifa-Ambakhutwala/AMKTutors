"use client";

import { useUserRole } from "@/hooks/useUserRole";
import { UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { role, loading, user } = useUserRole();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (role && !allowedRoles.includes(role)) {
                // Redirect based on actual role
                if (role === 'ADMIN') router.push("/admin");
                else if (role === 'TUTOR') router.push("/tutor");
                else if (role === 'PARENT') router.push("/parent");
                else router.push("/"); // Fallback
            }
        }
    }, [user, role, loading, allowedRoles, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || (role && !allowedRoles.includes(role))) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
