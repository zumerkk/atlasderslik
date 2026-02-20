"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Home, User } from "lucide-react";

const sidebarLinks = [
    { title: "Dashboard", href: "/parent", icon: Home },
    { title: "Profilim", href: "/parent/profile", icon: User },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayout
            role="PARENT"
            allowedRoles={["PARENT"]}
            sidebarLinks={sidebarLinks}
            profileHref="/parent/profile"
        >
            {children}
        </AppLayout>
    );
}
