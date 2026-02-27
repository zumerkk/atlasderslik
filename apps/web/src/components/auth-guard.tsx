"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { warmUpBackend } from "@/lib/api";

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        warmUpBackend(); // wake Render backend while checking auth
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (!token || !userStr) {
            router.replace("/login");
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (!allowedRoles.includes(user.role)) {
                // Wrong role — redirect to their own panel
                const roleMap: Record<string, string> = {
                    ADMIN: "/admin",
                    TEACHER: "/teacher",
                    STUDENT: "/student",
                    PARENT: "/parent",
                };
                router.replace(roleMap[user.role] || "/login");
                return;
            }
            setAuthorized(true);
        } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.replace("/login");
        } finally {
            setChecking(false);
        }
    }, [pathname, allowedRoles, router]);

    if (checking || !authorized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
