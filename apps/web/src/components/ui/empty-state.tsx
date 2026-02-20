import * as React from "react"
import { cn } from "@/lib/cn"
import { type LucideIcon, Inbox } from "lucide-react"
import { Button } from "./button"

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
            <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
                <Icon className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
            )}
            {action && (
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </div>
    )
}
