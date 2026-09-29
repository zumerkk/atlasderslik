"use client"

import { useState } from "react";
import AuthGuard from "@/components/auth-guard";
import { AppSidebar, type SidebarLink } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AtlasAIProvider } from "@/components/atlas-ai/atlas-ai-provider";
import { Sparkles } from "lucide-react";

interface AppLayoutProps {
    children: React.ReactNode;
    role: string;
    allowedRoles: string[];
    sidebarLinks: SidebarLink[];
    profileHref?: string;
}

export function AppLayout({
    children,
    role,
    allowedRoles,
    sidebarLinks,
    profileHref,
}: AppLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const atlasHref = `/${role.toLowerCase()}/atlas-ai`;
    const enhancedSidebarLinks = sidebarLinks.some((link) => link.href === atlasHref)
        ? sidebarLinks
        : [...sidebarLinks.slice(0, 1), { title: "AtlasAI", href: atlasHref, icon: Sparkles, badge: "YENİ" }, ...sidebarLinks.slice(1)];

    return (
        <AuthGuard allowedRoles={allowedRoles}>
            <AtlasAIProvider role={role}>
            <div className="flex min-h-screen bg-muted/30">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex shrink-0 sticky top-0 h-screen">
                    <AppSidebar
                        links={enhancedSidebarLinks}
                        role={role}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                    />
                </aside>

                {/* Mobile Sidebar (Sheet) */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="p-0 w-[260px] border-0">
                        <AppSidebar
                            links={enhancedSidebarLinks}
                            role={role}
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <AppTopbar
                        profileHref={profileHref}
                        onMenuClick={() => setMobileOpen(true)}
                    />
                    <main className="flex-1 p-4 lg:p-6 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
            </AtlasAIProvider>
        </AuthGuard>
    );
}
