"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, GraduationCap, User } from "lucide-react";

interface Course {
    _id: string;
    subjectId: { _id: string; name: string; description?: string; gradeLevel: number };
    teacherId: { firstName: string; lastName: string; email: string };
    gradeId: { level: number };
}

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/education/student/courses", { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setCourses(await res.json());
                else if (res.status === 403) setError("Bu sayfaya erişim yetkiniz bulunmuyor.");
            } catch (err) { console.error(err); setError("Dersler yüklenirken bir hata oluştu."); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const subjectMap = new Map<string, { subject: any; teachers: any[]; gradeLevel: number }>();
    courses.forEach((c) => {
        const subId = c.subjectId?._id;
        if (!subId) return;
        if (!subjectMap.has(subId)) subjectMap.set(subId, { subject: c.subjectId, teachers: [], gradeLevel: c.gradeId?.level || c.subjectId?.gradeLevel });
        const entry = subjectMap.get(subId)!;
        if (c.teacherId && !entry.teachers.find((t) => t.email === c.teacherId.email)) entry.teachers.push(c.teacherId);
    });
    const uniqueCourses = Array.from(subjectMap.values());

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Derslerim" description="Kayıtlı olduğunuz sınıf seviyesine ait dersler." />

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200 animate-toast-in">{error}</div>
            )}

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
                </div>
            ) : uniqueCourses.length === 0 ? (
                <EmptyState icon={GraduationCap} title="Henüz kayıtlı ders yok" description="Kayıtlı olduğunuz bir sınıf bulunmuyor. Lütfen yöneticinizle iletişime geçin." />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {uniqueCourses.map((course) => (
                        <Card key={course.subject._id} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge variant="info">{course.gradeLevel}. Sınıf</Badge>
                                </div>
                                <CardTitle className="mt-3">{course.subject.name}</CardTitle>
                                {course.subject.description && <CardDescription className="line-clamp-2">{course.subject.description}</CardDescription>}
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-2">
                                    {course.teachers.map((teacher, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            <span>{teacher.firstName} {teacher.lastName}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button variant="outline" className="w-full">Dersi İncele</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
