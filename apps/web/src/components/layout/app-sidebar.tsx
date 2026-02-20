"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
    GraduationCap,
    ChevronLeft,
    LogOut,
    type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface SidebarLink {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

interface AppSidebarProps {
    links: SidebarLink[];
    role: string;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    className?: string;
}

export function AppSidebar({
    links,
    role,
    collapsed = false,
    onCollapsedChange,
    className,
}: AppSidebarProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        try {
            const u = localStorage.getItem("user");
            if (u) setUser(JSON.parse(u));
        } catch { }
    }, []);

    const roleLabelMap: Record<string, string> = {
        ADMIN: "Admin Paneli",
        TEACHER: "Öğretmen Paneli",
        STUDENT: "Öğrenci Paneli",
        PARENT: "Veli Paneli",
    };

    return (
        <div
            className={cn(
                "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
                collapsed ? "w-[68px]" : "w-[260px]",
                className
            )}
        >
            {/* Brand Header */}
            <div className={cn(
                "flex items-center border-b border-sidebar-border h-16 px-4",
                collapsed ? "justify-center" : "gap-3"
            )}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-sidebar-primary truncate">Atlas Derslik</span>
                        <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">{roleLabelMap[role] || role}</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
                <div className="space-y-1">
                    {links.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href + "/"));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.title : undefined}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    collapsed && "justify-center px-0",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                            >
                                <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-blue-400")} />
                                {!collapsed && <span className="truncate">{item.title}</span>}
                                {!collapsed && item.badge && (
                                    <span className="ml-auto text-[10px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="border-t border-sidebar-border p-3">
                {/* Collapse toggle (desktop only) */}
                {onCollapsedChange && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCollapsedChange(!collapsed)}
                        className={cn(
                            "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mb-2",
                            collapsed && "px-0"
                        )}
                    >
                        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                        {!collapsed && <span className="ml-2 text-xs">Daralt</span>}
                    </Button>
                )}

                {/* User info */}
                {user && !collapsed && (
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground shrink-0">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-sidebar-foreground truncate">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
