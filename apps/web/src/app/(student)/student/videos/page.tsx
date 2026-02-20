"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayCircle, ExternalLink, Clock, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";

interface VideoItem {
    _id: string;
    title: string;
    description: string;
    videoUrl: string;
    durationMinutes: number;
    views: number;
    subjectId: { _id: string; name: string };
    teacherId: { firstName: string; lastName: string };
}

export default function StudentVideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => { fetchVideos(); }, []);

    const fetchVideos = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiGet("/education/student/dashboard");
            if (res.ok) {
                const data = await res.json();
                // Show all videos — don't silently filter out empty URLs
                setVideos(data.videos || []);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Error fetching videos:", err);
            setError(true);
        }
        finally { setLoading(false); }
    };

    const getYouTubeThumbnail = (url: string) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
    };

    const formatDuration = (mins: number) => {
        if (!mins) return "";
        if (mins < 60) return `${mins} dk`;
        return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Konu Anlatım Videoları" description="Sınıf seviyenize uygun ders anlatım videoları." />

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-72 rounded-2xl" />)}
                </div>
            ) : error ? (
                <div className="text-center py-16 space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Videolar yüklenirken bir hata oluştu.</p>
                    <Button variant="outline" onClick={fetchVideos}><RefreshCw className="h-4 w-4" /> Tekrar Dene</Button>
                </div>
            ) : videos.length === 0 ? (
                <EmptyState icon={PlayCircle} title="Henüz video yok" description="Sınıf seviyenize uygun konu anlatım videosu henüz eklenmemiş." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {videos.map((vid) => {
                        const thumbnail = getYouTubeThumbnail(vid.videoUrl);
                        return (
                            <Card key={vid._id} className="overflow-hidden group hover:shadow-lg transition-all">
                                {/* Video Thumbnail / Play Area */}
                                <div
                                    className="aspect-video relative flex items-center justify-center cursor-pointer bg-gradient-to-br from-gray-100 to-gray-200"
                                    onClick={() => vid.videoUrl && window.open(vid.videoUrl, '_blank')}
                                    style={thumbnail ? { backgroundImage: `url(${thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                                    <PlayCircle className="h-14 w-14 text-white opacity-90 group-hover:scale-110 transition-transform z-10 drop-shadow-lg" />
                                    {vid.durationMinutes > 0 && (
                                        <div className="absolute bottom-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <Clock className="h-3 w-3" />{formatDuration(vid.durationMinutes)}
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="w-fit">{vid.subjectId?.name || "Ders"}</Badge>
                                        {vid.views > 0 && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                                <Eye className="h-3 w-3" />{vid.views}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-base line-clamp-2 mt-1" title={vid.title}>{vid.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{vid.teacherId?.firstName} {vid.teacherId?.lastName}</p>
                                </CardHeader>

                                <CardContent className="pb-2">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{vid.description || "Açıklama bulunmuyor."}</p>
                                </CardContent>

                                <CardFooter className="border-t pt-4">
                                    {vid.videoUrl ? (
                                        <Button className="w-full" asChild>
                                            <a href={vid.videoUrl} target="_blank" rel="noopener noreferrer">
                                                <PlayCircle className="h-4 w-4" /> Videoyu İzle <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button className="w-full" variant="outline" disabled>
                                            Video linki bulunamadı
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
