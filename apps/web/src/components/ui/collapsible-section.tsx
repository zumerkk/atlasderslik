"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  count?: number;
  countLabel?: string;
  /** Open on first render. Sections stay uncontrolled after that. */
  defaultOpen?: boolean;
  tone?: "default" | "muted" | "warning";
  children: React.ReactNode;
  className?: string;
}

const TONE = {
  default: "bg-card border-border",
  muted: "bg-muted/30 border-border/70",
  warning: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40",
} as const;

export function CollapsibleSection({
  title,
  description,
  icon,
  count,
  countLabel = "",
  defaultOpen = false,
  tone = "default",
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${TONE[tone]} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {count !== undefined && (
            <Badge variant="outline" className="text-[10px] font-bold">
              {count} {countLabel}
            </Badge>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && <div className="px-4 pb-4 pt-1 animate-fade-in">{children}</div>}
    </div>
  );
}
