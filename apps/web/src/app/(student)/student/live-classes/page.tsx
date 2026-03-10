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
    platform?: string;
    meetingId?: string;
    passcode?: string;
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
                                <div className="flex items-center gap-2 mt-2">
                                    {cls.platform === "ZOOM" ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Zoom</Badge>
                                    ) : cls.platform === "MEET" ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Google Meet</Badge>
                                    ) : (
                                        <Badge variant="outline">Diğer Platform</Badge>
                                    )}
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
                                {cls.platform === "ZOOM" && (cls.meetingId || cls.passcode) && (
                                    <div className="mt-4 p-3.5 bg-blue-50/50 rounded-xl text-sm space-y-2 border border-blue-100">
                                        {cls.meetingId && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Meeting ID</span>
                                                <span className="font-mono font-bold text-base text-foreground bg-white px-2 py-1 rounded border shadow-sm select-all inline-block">{cls.meetingId}</span>
                                            </div>
                                        )}
                                        {cls.passcode && (
                                            <div className="flex flex-col gap-1 mt-2">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Passcode</span>
                                                <span className="font-mono font-bold text-base text-foreground bg-white px-2 py-1 rounded border shadow-sm select-all inline-block">{cls.passcode}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full" variant={cls.platform === "ZOOM" ? "default" : "secondary"} asChild>
                                    <a href={cls.url} target="_blank">
                                        <Video className="h-4 w-4 mr-2" />
                                        {cls.platform === "ZOOM" ? "Zoom ile Katıl" : cls.platform === "MEET" ? "Google Meet ile Katıl" : "Derse Katıl"}
                                        <ExternalLink className="h-3.5 w-3.5 ml-2" />
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
