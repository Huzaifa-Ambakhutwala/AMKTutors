"use client";

import { useUserRole } from "@/hooks/useUserRole";
import { UserRole } from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { role, loading, user } = useUserRole();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            const returnUrl = pathname ? encodeURIComponent(pathname) : "";
            router.push(returnUrl ? `/login?returnUrl=${returnUrl}` : "/login");
            return;
        }
        if (role && !allowedRoles.includes(role)) {
            if (role === "ADMIN") router.push("/admin");
            else if (role === "TUTOR") router.push("/tutor");
            else if (role === "PARENT") router.push("/parent");
            else router.push("/");
        }
    }, [user, role, loading, allowedRoles, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || (role && !allowedRoles.includes(role))) {
        return null;
    }

    return <>{children}</>;
}
