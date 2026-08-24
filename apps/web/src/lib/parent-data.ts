"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export interface ParentAssignment {
    _id: string;
    title: string;
    subject: string | null;
    dueDate: string | null;
    maxScore: number | null;
    isExpired: boolean;
    submitted: boolean;
    submittedAt: string | null;
    isLate: boolean;
    grade: number | null;
    feedback: string | null;
    opticResult: { correct: number; incorrect: number; empty: number; score?: number } | null;
}

export interface ParentSummary {
    totalAssignments: number;
    submitted: number;
    pending: number;
    missed: number;
    late: number;
    averageGrade: number | null;
    examCount: number;
    opticTotals: { correct: number; incorrect: number; empty: number };
    netAverage: number | null;
}

export interface ParentStudent {
    student: { _id: string; firstName: string; lastName: string; email: string };
    grade: { _id: string; level: number; label?: string } | null;
    courses: Array<{
        _id: string;
        subjectId: { _id: string; name: string; zoomUrl?: string; zoomMeetingId?: string; zoomPasscode?: string };
        teacherId: { firstName: string; lastName: string; email: string };
    }>;
    enrollmentDate: string | null;
    assignments: ParentAssignment[];
    summary: ParentSummary;
}

/**
 * All three parent screens read the same consolidated endpoint, so the fetch,
 * the error handling and the "which child am I looking at" selection live here
 * instead of being copy-pasted into each page.
 */
export function useParentData() {
    const [students, setStudents] = useState<ParentStudent[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiGet("/education/parent/dashboard");
                if (!res.ok) throw new Error("request failed");
                const data = await res.json();
                if (cancelled) return;
                const list: ParentStudent[] = data.students || [];
                setStudents(list);
                setActiveId(list[0]?.student?._id ?? null);
            } catch {
                if (!cancelled) setError("Veriler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const active = students.find((s) => s.student?._id === activeId) ?? students[0] ?? null;

    return { students, active, activeId: active?.student?._id ?? null, setActiveId, loading, error };
}

export function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

/** MEB scoring: every four wrong answers cancel one correct. */
export function net(correct: number, incorrect: number) {
    return Number((correct - incorrect / 4).toFixed(2));
}
