"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
    LayoutDashboard,
    BookOpen,
    Video,
    PlayCircle,
    FileText,
    GraduationCap,
    User,
    CalendarDays,
    CreditCard,
} from "lucide-react";

const sidebarLinks = [
    { title: "Dashboard", href: "/student", icon: LayoutDashboard },
    { title: "Derslerim", href: "/student/courses", icon: BookOpen },
    { title: "Ders Programım", href: "/student/schedule", icon: CalendarDays },
    { title: "Canlı Dersler", href: "/student/live-classes", icon: Video },
    { title: "Konu Anlatımları", href: "/student/videos", icon: PlayCircle },
    { title: "Ödevlerim", href: "/student/assignments", icon: FileText },
    { title: "Sınavlarım", href: "/student/exams", icon: GraduationCap },
    { title: "Paketlerim", href: "/student/packages", icon: CreditCard },
    { title: "Profilim", href: "/student/profile", icon: User },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayout
            role="STUDENT"
            allowedRoles={["STUDENT"]}
            sidebarLinks={sidebarLinks}
            searchPlaceholder="Derslerde ara..."
            profileHref="/student/profile"
        >
            {children}
        </AppLayout>
    );
}
