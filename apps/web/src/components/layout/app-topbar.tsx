"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, LogOut, User, Settings, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface AppTopbarProps {
    searchPlaceholder?: string;
    profileHref?: string;
    onMenuClick?: () => void;
}

export function AppTopbar({
    searchPlaceholder = "Ara...",
    profileHref = "/profile",
    onMenuClick,
}: AppTopbarProps) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        try {
            const u = localStorage.getItem("user");
            if (u) setUser(JSON.parse(u));
        } catch { }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    return (
        <header className="flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-30">
            {/* Mobile menu */}
            {onMenuClick && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menüyü aç</span>
                </Button>
            )}

            {/* Search */}
            <div className="w-full flex-1">
                <form>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                            type="search"
                            placeholder={searchPlaceholder}
                            className="pl-9 bg-muted/50 border-0 shadow-none focus-visible:ring-1 focus-visible:bg-background h-10 rounded-xl"
                        />
                    </div>
                </form>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative rounded-xl text-muted-foreground hover:text-foreground">
                    <Bell className="h-[18px] w-[18px]" />
                    <span className="sr-only">Bildirimler</span>
                </Button>

                {/* Profile dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
                        <DropdownMenuLabel className="font-normal px-3 py-2">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                            <Link href={profileHref} className="flex items-center gap-2">
                                <User className="h-4 w-4" /> Profilim
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
                            <LogOut className="h-4 w-4 mr-2" />
                            Çıkış Yap
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
