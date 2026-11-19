"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BookOpen, Download, FileText, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useAtlasAI } from "./atlas-ai-provider";
import styles from "./atlas-materials.module.css";

type Topic = { id: string; name: string; subject: string; gradeLevel: number; version: string; sourceUrl: string; sourceTitle: string; outcomes: { id: string; code: string; text: string }[] };
type Material = { id: string; title: string; kind: string; createdAt: string; curriculum: { subject: string; topic: string } };
type Student = { id: string; name: string };
const errorMessage = async (response: Response) => { const value = await response.json().catch(() => null); return Array.isArray(value?.message) ? value.message.join(" ") : value?.message || "İşlem tamamlanamadı."; };

export function AtlasMaterialsPanel() {
  const atlas = useAtlasAI();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [kind, setKind] = useState<"lesson" | "worksheet">("lesson");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentRequest = useRef(0);
  const currentContext = useRef({ accountId: atlas.accountId, studentId });
  currentContext.current = { accountId: atlas.accountId, studentId };
  const topic = topics.find(item => item.id === topicId);
  useEffect(() => {
    const controller = new AbortController(); setStudents([]); setStudentId("");
    if (atlas.accountId && atlas.role !== "STUDENT") void apiGet("/atlas-ai/insights", { signal: controller.signal }).then(async response => {
      if (response.ok) { const value = await response.json(); if (!controller.signal.aborted) setStudents(value.students || []); }
    }).catch(() => {});
    return () => controller.abort();
  }, [atlas.accountId, atlas.role]);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!atlas.accountId) return;
    const revision = ++currentRequest.current; setLoading(true); setError(null); setTopics([]); setMaterials([]); setTopicId("");
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    try {
      const [scopeResponse, listResponse] = await Promise.all([apiGet(`/atlas-ai/curriculum/scope${query}`, { signal }), apiGet(`/atlas-materials${query}`, { signal })]);
      if (!scopeResponse.ok) throw new Error(await errorMessage(scopeResponse));
      if (!listResponse.ok) throw new Error(await errorMessage(listResponse));
      const [scope, list] = await Promise.all([scopeResponse.json(), listResponse.json()]);
      if (signal?.aborted || revision !== currentRequest.current) return;
      setTopics(scope.topics || []); setTopicId(scope.topics?.[0]?.id || ""); setMaterials(list);
    } catch (value) { if (!signal?.aborted && revision === currentRequest.current) setError(value instanceof Error ? value.message : "Bağlantı kurulamadı."); }
    finally { if (!signal?.aborted && revision === currentRequest.current) setLoading(false); }
  }, [atlas.accountId, studentId]);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  const create = async () => {
    if (!topicId || creating) return;
    const revision = currentRequest.current; setCreating(true); setError(null);
    try {
      const response = await apiPost("/atlas-materials", { topicId, kind, ...(studentId ? { studentId } : {}) }, { timeout: 300000 });
      if (!response.ok) throw new Error(await errorMessage(response));
      if (revision === currentRequest.current) await refresh();
    } catch (value) { if (revision === currentRequest.current) setError(value instanceof Error ? value.message : "Materyal hazırlanamadı."); }
    finally { setCreating(false); }
  };
  const download = async (material: Material) => {
    const context = { ...currentContext.current }; setDownloading(material.id); setError(null);
    try {
      const response = await apiGet(`/atlas-materials/${material.id}/pdf`, { timeout: 60000 });
      if (!response.ok) throw new Error(await errorMessage(response));
      const blob = await response.blob();
      if (currentContext.current.accountId !== context.accountId || currentContext.current.studentId !== context.studentId) return;
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `atlas-${material.kind}-${material.id}.pdf`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (value) { if (currentContext.current.accountId === context.accountId && currentContext.current.studentId === context.studentId) setError(value instanceof Error ? value.message : "PDF indirilemedi."); }
    finally { setDownloading(null); }
  };
  return <section className={styles.panel} aria-label="AtlasAI PDF materyalleri">
    <div className={styles.heading}><div><span>ATLAS DERSLİK / ÖĞRENME MATERYALLERİ</span><h2>Dersine uygun, yanında hazır.</h2><p>Onaylı kazanımlardan konu anlatımı ve çalışma kâğıdı oluştur.</p></div><button onClick={() => void refresh()} disabled={loading || creating}><RefreshCw size={16} /> Yenile</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {atlas.role !== "STUDENT" && students.length > 0 && <label className={styles.field}>Öğrenci kapsamı<select value={studentId} disabled={creating} onChange={event => setStudentId(event.target.value)}><option value="">{atlas.role === "PARENT" ? "Bağlı öğrenciler" : "Yetkili dersler"}</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>}
    <div className={styles.template}><div className={styles.paper} aria-hidden="true"><Image src="/assets/images/deer-logo.png" alt="" width={23} height={23} /><strong>ATLAS DERSLİK</strong><span>KONU ANLATIMI</span><i /><i /><i /><b>ATLAS</b></div><div><span className={styles.badge}><ShieldCheck size={15} /> Ortak Atlas şablonu</span><h3>Bilgiye alan açan bir tasarım.</h3><p>A4 düzen, Atlas logosu, filigran, Türkçe yazı tipi, kaynak bilgisi, sayfa numarası ve ayrı cevap bölümü.</p><small>Üretilen içerik öğrenme desteğidir; öğretmen kontrolü önerilir.</small></div></div>
    {loading ? <p className={styles.empty} role="status"><LoaderCircle size={20} /> Onaylı müfredat yükleniyor.</p> : !topics.length ? <div className={styles.empty}><BookOpen size={26} /><h3>Önce müfredat onayı gerekiyor.</h3><p>Yönetici, Konular ekranından sınıfına ait güncel MEB kaynaklarını ve kazanımları doğruladıktan sonra materyal hazırlayabilirsin.</p></div> : <>
      <div className={styles.form}><label className={styles.field}>Ders ve konu<select value={topicId} disabled={creating} onChange={event => setTopicId(event.target.value)}>{topics.map((item, index) => <option key={`${item.id}-${index}`} value={item.id}>{item.gradeLevel}. sınıf · {item.subject} · {item.name}</option>)}</select></label><label className={styles.field}>Materyal türü<select value={kind} disabled={creating} onChange={event => setKind(event.target.value as "lesson" | "worksheet")}><option value="lesson">Konu anlatımı ve örnekler</option><option value="worksheet">Çalışma kâğıdı ve alıştırmalar</option></select></label></div>
      {topic && <div className={styles.outcomes}><strong>{topic.version}</strong>{topic.outcomes.map(item => <p key={item.id}>{item.code} · {item.text}</p>)}<a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">{topic.sourceTitle}</a></div>}
      <button className={styles.primary} disabled={creating || !atlas.status?.vision || !topicId} onClick={() => void create()}>{creating ? <LoaderCircle size={17} className={styles.spin} /> : <FileText size={17} />}{creating ? "Materyal hazırlanıyor ve kazanımlar kontrol ediliyor…" : "PDF materyali hazırla"}</button>
      {!atlas.status?.vision && <p className={styles.note}>Materyal üretimi için OpenAI bağlantısının etkin olması gerekir.</p>}
    </>}
    <div className={styles.saved}><h3>Materyallerim</h3>{!materials.length ? <p>Hazırladığın güncel materyaller burada görünür.</p> : materials.map(item => <div key={item.id}><FileText size={20} /><span><strong>{item.title}</strong><small>{item.curriculum.subject} · {new Date(item.createdAt).toLocaleDateString("tr-TR")}</small></span><button disabled={!!downloading} onClick={() => void download(item)}>{downloading === item.id ? <LoaderCircle className={styles.spin} size={16} /> : <Download size={16} />} PDF indir</button></div>)}</div>
  </section>;
}
