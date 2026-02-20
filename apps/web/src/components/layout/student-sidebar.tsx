"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    GraduationCap,
    User,
    Video,
    PlayCircle
} from "lucide-react";

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/student",
        icon: LayoutDashboard,
    },
    {
        title: "Derslerim",
        href: "/student/courses",
        icon: BookOpen,
    },
    {
        title: "Canlı Dersler",
        href: "/student/live-classes",
        icon: Video,
    },
    {
        title: "Konu Anlatımları",
        href: "/student/videos",
        icon: PlayCircle,
    },
    {
        title: "Ödevlerim",
        href: "/student/assignments",
        icon: FileText,
    },
    {
        title: "Sınavlarım",
        href: "/student/exams",
        icon: GraduationCap,
    },
    {
        title: "Profilim",
        href: "/student/profile",
        icon: User,
    },
];

export function StudentSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
            <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <span className="text-xl font-bold text-primary">Atlas Derslik</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-muted text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
