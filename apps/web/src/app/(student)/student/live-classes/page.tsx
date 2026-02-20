"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Video, Calendar, Clock, ExternalLink } from "lucide-react";

interface LiveClass {
    _id: string;
    title: string;
    description: string;
    url: string;
    startTime: string;
    durationMinutes: number;
    subjectId: { _id: string; name: string };
    teacherId: { firstName: string; lastName: string };
}

export default function StudentLiveClassesPage() {
    const [classes, setClasses] = useState<LiveClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/education/student/dashboard", { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) { const data = await res.json(); setClasses(data.liveClasses || []); }
            } catch (error) { console.error("Error fetching live classes:", error); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Canlı Derslerim" description="Katılabileceğiniz yaklaşan canlı dersler." />

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
                </div>
            ) : classes.length === 0 ? (
                <EmptyState icon={Video} title="Planlanmış ders yok" description="Şu an katılabileceğiniz canlı ders bulunmamaktadır." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls._id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary">{cls.subjectId?.name}</Badge>
                                    {new Date(cls.startTime) < new Date()
                                        ? <Badge variant="destructive">Bitti</Badge>
                                        : <Badge variant="success">Yaklaşıyor</Badge>
                                    }
                                </div>
                                <CardTitle className="text-lg mt-2">{cls.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">Öğretmen: {cls.teacherId?.firstName} {cls.teacherId?.lastName}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(cls.startTime).toLocaleDateString("tr-TR")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{new Date(cls.startTime).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })} ({cls.durationMinutes} dk)</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full" asChild>
                                    <a href={cls.url} target="_blank">
                                        <Video className="h-4 w-4" /> Derse Katıl <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
