"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, BookOpen, User, Video, ExternalLink, Users, Rocket } from "lucide-react";
import { apiGet } from "@/lib/api";

interface StudentData {
    student: { _id: string; firstName: string; lastName: string; email: string };
    grade: { _id: string; level: number; label?: string };
    courses: Array<{
        _id: string;
        subjectId: { _id: string; name: string; gradeLevel: number; zoomUrl?: string; zoomMeetingId?: string; zoomPasscode?: string };
        teacherId: { firstName: string; lastName: string; email: string };
        gradeId: { level: number; label?: string };
    }>;
    enrollmentDate: string;
}

export default function ParentDashboard() {
    const [parentUser, setParentUser] = useState<any>(null);
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const u = localStorage.getItem("user");
        if (u) setParentUser(JSON.parse(u));

        const fetchDashboard = async () => {
            try {
                const res = await apiGet("/education/parent/dashboard");
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data.students || []);
                } else {
                    setError("Veriler yüklenirken bir hata oluştu.");
                }
            } catch (err) {
                console.error(err);
                setError("Bağlantı kurulamadı.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title={parentUser ? `Hoş geldiniz, ${parentUser.firstName}` : "Hoş geldiniz"}
                description="Veli Paneli — Çocuklarınızın eğitim durumunu takip edin."
            />

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200 animate-toast-in">{error}</div>
            )}

            {loading ? (
                <div className="space-y-6">
                    {[1, 2].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
                </div>
            ) : students.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Henüz bağlı öğrenci yok"
                    description="Yöneticinizle iletişime geçerek çocuğunuzun kaydını veli hesabınıza bağlatabilirsiniz."
                />
            ) : (
                <div className="space-y-8">
                    {students.map((studentData) => {
                        const { student, grade, courses } = studentData;

                        // Deduplicate courses by subject
                        const subjectMap = new Map<string, { subject: any; teachers: any[] }>();
                        courses.forEach((c) => {
                            const subId = c.subjectId?._id;
                            if (!subId) return;
                            if (!subjectMap.has(subId)) subjectMap.set(subId, { subject: c.subjectId, teachers: [] });
                            const entry = subjectMap.get(subId)!;
                            if (c.teacherId && !entry.teachers.find((t: any) => t.email === c.teacherId.email)) {
                                entry.teachers.push(c.teacherId);
                            }
                        });
                        const uniqueCourses = Array.from(subjectMap.values());

                        return (
                            <div key={student._id}>
                                {/* Student Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{student.firstName} {student.lastName}</h2>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="info">{grade?.label || `${grade?.level}. Sınıf`}</Badge>
                                            <span className="text-xs text-muted-foreground">{student.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Courses Grid */}
                                {uniqueCourses.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                            Bu öğrenciye henüz ders atanmamış.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {uniqueCourses.map((course) => (
                                            <Card key={course.subject._id} className="flex flex-col hover:shadow-md transition-shadow">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                                            <BookOpen className="h-4 w-4 text-primary" />
                                                        </div>
                                                    </div>
                                                    <CardTitle className="text-base mt-2">{course.subject.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-1 space-y-2">
                                                    {course.teachers.map((t: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <User className="h-3.5 w-3.5" />
                                                            <span>{t.firstName} {t.lastName}</span>
                                                        </div>
                                                    ))}
                                                    {course.subject.zoomMeetingId && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                                                            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                                                                <Video className="h-3 w-3" />
                                                                Zoom
                                                            </div>
                                                            <div className="text-blue-600">ID: {course.subject.zoomMeetingId}</div>
                                                            {course.subject.zoomPasscode && (
                                                                <div className="text-blue-600">Şifre: {course.subject.zoomPasscode}</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                                <CardFooter className="border-t pt-3">
                                                    {course.subject.zoomUrl ? (
                                                        <Button size="sm" className="w-full" asChild>
                                                            <a href={course.subject.zoomUrl} target="_blank" rel="noopener noreferrer">
                                                                <Video className="h-3.5 w-3.5" />
                                                                Derse Git
                                                                <ExternalLink className="h-3 w-3 ml-1" />
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline" className="w-full" disabled>
                                                            Link Eklenmemiş
                                                        </Button>
                                                    )}
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
