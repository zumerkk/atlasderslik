import * as React from "react"
import { cn } from "@/lib/cn"
import { type LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: string
    trendUp?: boolean
    iconBg?: string
    iconColor?: string
    className?: string
    onClick?: () => void
    loading?: boolean
}

export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    trendUp = true,
    iconBg = "bg-blue-50",
    iconColor = "text-blue-600",
    className,
    onClick,
    loading = false,
}: StatCardProps) {
    if (loading) {
        return (
            <div className={cn("rounded-2xl border border-border/60 bg-card p-5 shadow-sm", className)}>
                <div className="flex items-center justify-between mb-4">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                </div>
                <div className="skeleton skeleton-title w-20 mb-2" />
                <div className="skeleton skeleton-text w-24" />
            </div>
        )
    }

    return (
        <div
            className={cn(
                "rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md",
                onClick && "cursor-pointer hover:-translate-y-0.5",
                className
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                {trend && (
                    <span
                        className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            trendUp
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600"
                        )}
                    >
                        {trend}
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{title}</p>
        </div>
    )
}
