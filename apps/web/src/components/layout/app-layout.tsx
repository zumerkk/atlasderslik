"use client"

import { useState } from "react";
import AuthGuard from "@/components/auth-guard";
import { AppSidebar, type SidebarLink } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface AppLayoutProps {
    children: React.ReactNode;
    role: string;
    allowedRoles: string[];
    sidebarLinks: SidebarLink[];
    searchPlaceholder?: string;
    profileHref?: string;
}

export function AppLayout({
    children,
    role,
    allowedRoles,
    sidebarLinks,
    searchPlaceholder,
    profileHref,
}: AppLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <AuthGuard allowedRoles={allowedRoles}>
            <div className="flex min-h-screen bg-muted/30">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex shrink-0 sticky top-0 h-screen">
                    <AppSidebar
                        links={sidebarLinks}
                        role={role}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                    />
                </aside>

                {/* Mobile Sidebar (Sheet) */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="p-0 w-[260px] border-0">
                        <AppSidebar
                            links={sidebarLinks}
                            role={role}
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <AppTopbar
                        searchPlaceholder={searchPlaceholder}
                        profileHref={profileHref}
                        onMenuClick={() => setMobileOpen(true)}
                    />
                    <main className="flex-1 p-4 lg:p-6 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
