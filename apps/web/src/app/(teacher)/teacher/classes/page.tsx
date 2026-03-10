"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, BookOpen, Video, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/api";
import Link from "next/link";

interface AssignmentData {
    _id: string;
    gradeId: { _id: string; level: number; label?: string };
    subjectId: { _id: string; name: string; gradeLevel: number; zoomUrl?: string; zoomMeetingId?: string; zoomPasscode?: string };
}

export default function TeacherClassesPage() {
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiGet("/education/teacher-assignments/mine");
                if (res.ok) { setAssignments(await res.json()); }
                else { setError("Atamalar yüklenirken hata oluştu."); }
            } catch (err) { console.error(err); setError("Sınıflar yüklenirken bir hata oluştu."); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Sınıflarım" description="Yönetiminizdeki dersler ve sınıflar." />

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200 animate-toast-in">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton h-48 rounded-2xl" />
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="Henüz atanmış ders yok"
                    description="Yönetici tarafından size ders ataması yapılması gerekiyor."
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {assignments.map((a) => (
                        <Card key={a._id} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge variant="info">{a.gradeId?.label || `${a.gradeId?.level}. Sınıf`}</Badge>
                                </div>
                                <CardTitle className="mt-3">{a.subjectId?.name}</CardTitle>
                                <CardDescription className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    Atanmış Ders
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {/* Zoom Meeting Info */}
                                {a.subjectId?.zoomMeetingId && (
                                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                                            <Video className="h-3.5 w-3.5" />
                                            Zoom Bilgileri
                                        </div>
                                        <div className="text-blue-600">
                                            <span className="text-muted-foreground">ID:</span> {a.subjectId.zoomMeetingId}
                                        </div>
                                        {a.subjectId?.zoomPasscode && (
                                            <div className="text-blue-600">
                                                <span className="text-muted-foreground">Şifre:</span> {a.subjectId.zoomPasscode}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-2 border-t pt-4">
                                {a.subjectId?.zoomUrl ? (
                                    <Button className="w-full" size="sm" asChild>
                                        <a href={a.subjectId.zoomUrl} target="_blank" rel="noopener noreferrer">
                                            <Video className="h-4 w-4" />
                                            Derse Katıl
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                    </Button>
                                ) : (
                                    <>
                                        <Button className="w-full" variant="outline" size="sm" asChild>
                                            <Link href="/teacher/assignments">Ödev Ver</Link>
                                        </Button>
                                        <Button className="w-full" size="sm" asChild>
                                            <Link href="/teacher/live-classes">Canlı Ders</Link>
                                        </Button>
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
