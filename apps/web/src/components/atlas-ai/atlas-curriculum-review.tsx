"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type Entry = { _id: string; gradeId: string; schoolYear: string; version: string; program: string; sourceUrl: string; sourceTitle: string; sourceLocator: string; outcomes: { code: string; text: string }[]; status: string; contentHash: string; reviewNote: string; approvedAt?: string };
type Grade = { _id: string; level: number; label: string; isActive: boolean };

export function AtlasCurriculumReview({ topic, gradeLevel, onClose }: { topic: { _id: string; name: string }; gradeLevel: number; onClose: () => void }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [year, setYear] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [version, setVersion] = useState("");
  const [program, setProgram] = useState(gradeLevel === 8 || gradeLevel === 4 || gradeLevel === 12 ? "PREVIOUS" : "TYMM");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceLocator, setSourceLocator] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const entry = entries.find(e => e.gradeId === gradeId && e.schoolYear === year);
  const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm";

  const reload = useCallback(async () => {
    const response = await apiGet(`/atlas-ai/curriculum/review?topicId=${topic._id}`, { retries: 0 });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Müfredat kayıtları alınamadı.");
    setYear(data.schoolYear);
    setEntries(data.entries);
  }, [topic._id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [response] = await Promise.all([apiGet("/education/grades", { retries: 0 }), reload()]);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Sınıflar alınamadı.");
        if (cancelled) return;
        const list = data.filter((g: Grade) => g.level === gradeLevel && g.isActive);
        setGrades(list); setGradeId(list[0]?._id || "");
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Kayıtlar alınamadı."); }
    }
    void load();
    return () => { cancelled = true; };
  }, [gradeLevel, reload]);

  useEffect(() => {
    setVersion(entry?.version || ""); setProgram(entry?.program || (gradeLevel === 8 || gradeLevel === 4 || gradeLevel === 12 ? "PREVIOUS" : "TYMM"));
    setSourceUrl(entry?.sourceUrl || ""); setSourceTitle(entry?.sourceTitle || ""); setSourceLocator(entry?.sourceLocator || "");
    setOutcomes(entry?.outcomes.map(o => `${o.code} | ${o.text}`).join("\n") || ""); setReviewNote("");
  }, [entry, gradeLevel]);

  async function save() {
    setBusy(true); setMessage("");
    try {
      const parsed = outcomes.split("\n").filter(line => line.trim()).map(line => {
        const split = line.indexOf("|");
        if (split <= 0 || !line.slice(split + 1).trim()) throw new Error("Her satırda resmî çıktı kodu | açıklaması olmalı.");
        return { code: line.slice(0, split).trim(), text: line.slice(split + 1).trim() };
      });
      const response = await apiPost("/atlas-ai/curriculum/draft", { topicId: topic._id, gradeId, schoolYear: year, version, program, sourceUrl, sourceTitle, sourceLocator, outcomes: parsed });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(" ") : data.message || "Taslak kaydedilemedi.");
      await reload(); setMessage("Taslak kaydedildi. Resmî belgeyi inceleyip aşağıdaki onay adımını tamamlayın.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Taslak kaydedilemedi."); }
    finally { setBusy(false); }
  }

  async function review(action: "approve" | "revoke") {
    if (!entry) return;
    setBusy(true); setMessage("");
    try {
      const response = await apiPatch(`/atlas-ai/curriculum/${entry._id}/${action}`, { contentHash: entry.contentHash, reviewNote });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "İnceleme kaydedilemedi.");
      await reload(); setMessage(action === "approve" ? "Müfredat onaylandı. AtlasAI yalnızca bu sınıf ve resmî öğrenme çıktıları içinde çalışabilir." : "Onay kaldırıldı; bu içerik AtlasAI üretiminde kullanılamaz.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "İnceleme kaydedilemedi."); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Müfredat onayı · {topic.name}</DialogTitle><DialogDescription>AtlasAI, bu sınıf için resmî belgeyle eşleştirilip onaylanmış öğrenme çıktıları dışında ders içeriği üretemez.</DialogDescription></DialogHeader>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">2026–2027 yılında 1, 2, 3, 5, 6, 7, 9, 10 ve 11. sınıflarda Maarif Modeli uygulanır; 4, 8 ve 12. sınıflarda önceki program devam eder. <a className="underline" href="https://menderes.meb.gov.tr/www/20262027-egitim-ve-ogretim-yili-turkiye-yuzyili-maarif-modeli-temel-egitim-taslak-cerceve-planlari-yayimlandi/icerik/1760/" target="_blank" rel="noreferrer">MEB temel eğitim kapsamı</a> · <a className="underline" href="https://ogm.meb.gov.tr/www/2026-2027-egitim-ogretim-yili-turkiye-yuzyili-maarif-modeli-taslak-cerceve-planlar-yayimlandi/icerik/2633/tr" target="_blank" rel="noreferrer">MEB ortaöğretim kapsamı</a></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Sınıf<select className={selectClass} value={gradeId} onChange={e => setGradeId(e.target.value)}>{!grades.length && <option>Aktif sınıf bulunamadı</option>}{grades.map(g => <option key={g._id} value={g._id}>{g.level}. sınıf {g.label}</option>)}</select></label>
        <label className="space-y-1 text-sm">Eğitim öğretim yılı<Input value={year} disabled /></label>
        <label className="space-y-1 text-sm">Program<select className={selectClass} value={program} onChange={e => setProgram(e.target.value)}><option value="TYMM">Türkiye Yüzyılı Maarif Modeli</option><option value="PREVIOUS">Önceki öğretim programı</option></select></label>
        <label className="space-y-1 text-sm">Belge sürümü / karar tarihi<Input value={version} onChange={e => setVersion(e.target.value)} placeholder="Resmî belgedeki sürüm veya tarih" maxLength={120} /></label>
      </div>
      <label className="space-y-1 text-sm">Resmî kaynak bağlantısı<Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…meb.gov.tr/… (ilgili program belgesi)" maxLength={2000} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Belge adı<Input value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} maxLength={200} /></label><label className="space-y-1 text-sm">Sayfa / bölüm / öğrenme çıktısı konumu<Input value={sourceLocator} onChange={e => setSourceLocator(e.target.value)} placeholder="Örn. belgedeki sayfa ve ünite" maxLength={200} /></label></div>
      <label className="space-y-1 text-sm">Resmî öğrenme çıktıları<textarea className="min-h-40 w-full rounded-xl border p-3 text-sm" value={outcomes} onChange={e => setOutcomes(e.target.value)} placeholder="Her satır: resmî çıktı kodu | belgedeki açıklaması" /></label>
      <p className="text-xs text-muted-foreground">Kodları veya kazanımları tahmin etmeyin. İlgili resmî belgeden sınıf, ders ve konu eşleşmesini kontrol ederek aktarın. Taslak yeniden kaydedilirse önceki onay kalkar.</p>
      <Button onClick={save} disabled={busy || !gradeId || !version.trim() || !sourceUrl.trim() || !sourceTitle.trim() || !sourceLocator.trim() || !outcomes.trim()}>Taslağı kaydet</Button>
      {entry && <div className="space-y-3 rounded-xl border p-4"><p className="text-sm font-semibold">Durum: {entry.status === "approved" ? "Onaylı" : entry.status === "revoked" ? "Onayı kaldırılmış" : "İnceleme bekliyor"}</p><a className="break-all text-sm text-primary underline" href={entry.sourceUrl} target="_blank" rel="noreferrer">Kaydedilen resmî belgeyi aç</a><p className="text-sm">Onay, son kaydedilen taslağa uygulanır. Sınıfı, sürümü ve tüm çıktıların belgeyle birebir eşleştiğini kontrol edin.</p><label className="block space-y-1 text-sm">İnceleme notu<Input value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Kontrol edilen belge, bölüm ve uygunluk" maxLength={1000} /></label><div className="flex flex-wrap gap-2">{entry.status === "draft" && <Button disabled={busy || !reviewNote.trim()} onClick={() => review("approve")}>Resmî belgeyi kontrol ettim, onayla</Button>}{entry.status === "approved" && <Button variant="destructive" disabled={busy || !reviewNote.trim()} onClick={() => review("revoke")}>Onayı kaldır</Button>}</div></div>}
      {message && <p role="status" className="rounded-xl border p-3 text-sm">{message}</p>}
    </DialogContent>
  </Dialog>;
}
