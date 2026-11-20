"use client";

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/api';
import { lessonVideoApiBase } from '@/lib/lesson-video';

type Summary = {
  overview: string;
  sections: { title: string; summary: string; timestampSeconds: number; outcomeIds: string[] }[];
  keyPoints: string[];
  excludedContentNote: string;
  coverage: { note: string };
};
type Job = { status: 'not_requested' | 'queued' | 'processing' | 'completed' | 'failed'; progress?: string; error?: string; summary?: Summary };

export function LessonVideoPlayer({ videoId, title }: { videoId: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [job, setJob] = useState<Job>({ status: 'not_requested' });
  const [summaryError, setSummaryError] = useState('');
  const [summaryReady, setSummaryReady] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    setUrl(''); setError(''); setSummaryError(''); setSummaryReady(null); setInitializing(true); setJob({ status: 'not_requested' });
    void (async () => {
      const results = await Promise.allSettled([
        apiPost(`/lesson-videos/${videoId}/playback`, {}, { signal: controller.signal }),
        apiGet('/lesson-videos/status', { signal: controller.signal }),
        apiGet(`/lesson-videos/${videoId}/summary`, { signal: controller.signal }),
      ]);
      if (disposed) return;
      const playback = results[0];
      if (playback.status === 'fulfilled' && playback.value.ok) { const data = await playback.value.json(); if (!disposed) setUrl(`${lessonVideoApiBase}${data.path}`); }
      else if (playback.status === 'fulfilled') { const data = await playback.value.json().catch(() => ({})); if (!disposed) setError(data.message || 'Video açılamadı.'); }
      else setError('Video bağlantısı kurulamadı.');
      const capabilities = results[1];
      if (capabilities.status === 'fulfilled' && capabilities.value.ok) { const data = await capabilities.value.json(); if (!disposed) setSummaryReady(!!data.summaryReady); }
      const summary = results[2];
      if (summary.status === 'fulfilled' && summary.value.ok) { const data = await summary.value.json(); if (!disposed) setJob(data); }
      else if (summary.status === 'fulfilled') { const data = await summary.value.json().catch(() => ({})); if (!disposed) setSummaryError(data.message || 'Bu ders için onaylı müfredat bulunamadı.'); }
    })().catch(() => { if (!disposed) setError('Video bilgileri okunamadı. Pencereyi yeniden açın.'); }).finally(() => { if (!disposed) setInitializing(false); });
    return () => { disposed = true; controller.abort(); };
  }, [videoId]);

  useEffect(() => {
    if (!['queued', 'processing'].includes(job.status)) return;
    const controller = new AbortController();
    let pending = false;
    const timer = setInterval(() => {
      if (pending) return;
      pending = true;
      apiGet(`/lesson-videos/${videoId}/summary`, { signal: controller.signal, retries: 0 })
        .then(async response => {
          const data = await response.json().catch(() => ({}));
          if (controller.signal.aborted) return;
          if (response.ok) { setJob(data); setSummaryError(''); }
          else { setSummaryError(data.message || 'Ders özetine erişilemedi.'); setJob({ status: 'failed' }); }
        }).catch(() => { if (!controller.signal.aborted) setSummaryError('Bağlantı kesildi. Durum yeniden kontrol ediliyor.'); })
        .finally(() => { pending = false; });
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [videoId, job.status]);

  const requestSummary = async () => {
    setRequesting(true); setSummaryError('');
    try {
      const response = await apiPost(`/lesson-videos/${videoId}/summary`, {});
      const data = await response.json().catch(() => ({}));
      if (response.ok) setJob(data); else setSummaryError(data.message || 'Ders özeti başlatılamadı.');
    } catch { setSummaryError('Ders özeti bağlantısı kurulamadı.'); }
    finally { setRequesting(false); }
  };

  return <div className="space-y-4">
    <div className="aspect-video bg-black flex items-center justify-center rounded-xl overflow-hidden">
      {error ? <p role="alert" className="text-sm text-white p-6">{error}</p> : url ? <video ref={video} src={url} title={title} controls playsInline preload="metadata" className="h-full w-full" onError={() => setError('Video oynatılamadı. Erişimi yenilemek için pencereyi yeniden açın.')} /> : <Loader2 aria-label="Video hazırlanıyor" className="h-8 w-8 text-white animate-spin" />}
    </div>
    <div className="rounded-xl border bg-card p-4 space-y-3 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AtlasAI ders özeti</h4><p className="text-xs text-muted-foreground mt-1">Dersin sesi ve örnek tahta görüntüleri, onaylı müfredatla birlikte incelenir.</p></div>
        {job.status === 'not_requested' && <Button variant="outline" size="sm" disabled={initializing || requesting || summaryReady === false || !!summaryError} onClick={requestSummary}>{requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Özet çıkar</Button>}
      </div>
      {summaryReady === false && job.status === 'not_requested' && <p className="text-sm text-muted-foreground">Ders özeti servisi henüz kullanıma açılmadı.</p>}
      {summaryError && <p role="alert" className="text-sm text-rose-700 flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{summaryError}</p>}
      {['queued', 'processing'].includes(job.status) && <p aria-live="polite" className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{job.progress || 'Ders kaydı inceleniyor. Özet hazır olduğunda burada görünecek.'}</p>}
      {job.status === 'failed' && job.error && <p role="alert" className="text-sm text-rose-700">{job.error}</p>}
      {job.status === 'completed' && job.summary && <div className="space-y-4 text-sm">
        <p className="leading-relaxed whitespace-pre-line">{job.summary.overview}</p>
        {job.summary.sections.map((section, index) => <div key={index} className="border-t pt-3">
          <div className="flex items-center justify-between gap-3"><h5 className="font-medium">{section.title}</h5><button className="text-primary text-xs shrink-0 hover:underline" onClick={() => { if (video.current) { video.current.currentTime = section.timestampSeconds; void video.current.play().catch(() => undefined); } }}>{Math.floor(section.timestampSeconds / 60)}:{String(Math.floor(section.timestampSeconds % 60)).padStart(2, '0')} civarı</button></div>
          <p className="mt-1 text-muted-foreground whitespace-pre-line leading-relaxed">{section.summary}</p>
        </div>)}
        {job.summary.keyPoints.length > 0 && <div><h5 className="font-medium mb-2">Hatırlanacak noktalar</h5><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{job.summary.keyPoints.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
        {job.summary.excludedContentNote && <p className="text-xs text-muted-foreground">{job.summary.excludedContentNote}</p>}
        <p className="text-xs text-muted-foreground border-t pt-3">{job.summary.coverage.note}</p>
      </div>}
    </div>
  </div>;
}
