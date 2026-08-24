"use client";

import { Badge } from "@/components/ui/badge";
import type { ParentStudent } from "@/lib/parent-data";

interface Props {
    students: ParentStudent[];
    activeId: string | null;
    onSelect: (id: string) => void;
}

/**
 * Only rendered when a parent has more than one child linked — with a single
 * child the tabs would be noise, so the caller still gets a plain header.
 */
export function StudentSwitcher({ students, activeId, onSelect }: Props) {
    const current = students.find((s) => s.student?._id === activeId) ?? students[0];
    if (!current) return null;

    return (
        <div className="space-y-3">
            {students.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {students.map((s) => {
                        const isActive = s.student._id === activeId;
                        return (
                            <button
                                key={s.student._id}
                                onClick={() => onSelect(s.student._id)}
                                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                                }`}
                            >
                                {s.student.firstName} {s.student.lastName}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {current.student.firstName?.charAt(0)}
                    {current.student.lastName?.charAt(0)}
                </div>
                <div>
                    <h2 className="text-base font-bold leading-tight">
                        {current.student.firstName} {current.student.lastName}
                    </h2>
                    <Badge variant="info" className="mt-1">
                        {current.grade?.label || (current.grade ? `${current.grade.level}. Sınıf` : "Sınıf atanmamış")}
                    </Badge>
                </div>
            </div>
        </div>
    );
}
