"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Download, FileText, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useAtlasAI } from "./atlas-ai-provider";
import styles from "./atlas-materials.module.css";

type Topic = { id: string; name: string; subject: string; gradeLevel: number; version: string; sourceUrl: string; sourceTitle: string; outcomes: { id: string; code: string; text: string }[] };
type Material = { id: string; title: string; kind: string; createdAt: string; curriculum: { subject: string; topic: string } };
const errorMessage = async (response: Response) => {
  const value = await response.json().catch(() => null);
  return Array.isArray(value?.message) ? value.message.join(" ") : typeof value?.message === "string" ? value.message : "İşlem tamamlanamadı.";
};

export function AtlasMaterialsPanel() {
  const atlas = useAtlasAI();
  const studentId = atlas.selectedStudentId;
  const needsStudent = atlas.studentSelectionRequired;
  const administrator = ["ADMIN", "SUPERADMIN"].includes(atlas.role);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [kind, setKind] = useState<"lesson" | "worksheet">("lesson");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentRequest = useRef(0);
  const createAbort = useRef<AbortController | null>(null);
  const downloadAbort = useRef<AbortController | null>(null);
  const currentContext = useRef({ accountId: atlas.accountId, studentId });
  currentContext.current = { accountId: atlas.accountId, studentId };
  const topic = topics.find(item => item.id === topicId);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const revision = ++currentRequest.current;
    const context = { accountId: atlas.accountId, studentId };
    setLoading(true); setError(null); setTopics([]); setMaterials([]); setTopicId("");
    if (!context.accountId || needsStudent) { setLoading(false); return; }
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    try {
      const [scopeResponse, listResponse] = await Promise.all([
        apiGet(`/atlas-ai/curriculum/scope${query}`, { signal, retries: 0 }),
        apiGet(`/atlas-materials${query}`, { signal, retries: 0 }),
      ]);
      let scope: { topics?: Topic[] } = {};
      let missingCurriculum = false;
      if (scopeResponse.ok) scope = await scopeResponse.json();
      else {
        const message = await errorMessage(scopeResponse);
        missingCurriculum = scopeResponse.status === 403 && /onaylı müfredat/.test(message);
        if (!missingCurriculum) throw new Error(message);
      }
      let list: Material[] = [];
      if (listResponse.ok) list = await listResponse.json();
      else if (!(missingCurriculum && listResponse.status === 403)) throw new Error(await errorMessage(listResponse));
      if (signal?.aborted || revision !== currentRequest.current
        || currentContext.current.accountId !== context.accountId || currentContext.current.studentId !== context.studentId) return;
      const availableTopics = Array.isArray(scope.topics) ? scope.topics : [];
      setTopics(availableTopics); setTopicId(availableTopics[0]?.id || ""); setMaterials(Array.isArray(list) ? list : []);
    } catch (value) {
      if (!signal?.aborted && revision === currentRequest.current
        && currentContext.current.accountId === context.accountId && currentContext.current.studentId === context.studentId) {
        setError(value instanceof Error && value.name !== "TypeError" ? value.message : "Materyal bilgilerine ulaşılamadı. Bağlantıyı kontrol edip yeniden deneyebilirsin.");
      }
    } finally { if (!signal?.aborted && revision === currentRequest.current) setLoading(false); }
  }, [atlas.accountId, studentId, needsStudent]);

  useEffect(() => {
    const controller = new AbortController();
    createAbort.current?.abort(); downloadAbort.current?.abort();
    setCreating(false); setDownloading(null);
    void refresh(controller.signal);
    return () => { controller.abort(); createAbort.current?.abort(); downloadAbort.current?.abort(); };
  }, [refresh]);

  const create = async () => {
    if (!topicId || creating || needsStudent) return;
    const revision = currentRequest.current;
    const controller = new AbortController(); createAbort.current = controller;
    setCreating(true); setError(null);
    try {
      const response = await apiPost("/atlas-materials", { topicId, kind, ...(studentId ? { studentId } : {}) }, { timeout: 300000, retries: 0, signal: controller.signal });
      if (!response.ok) throw new Error(await errorMessage(response));
      if (!controller.signal.aborted && revision === currentRequest.current) await refresh();
    } catch (value) {
      if (!controller.signal.aborted && revision === currentRequest.current) {
        const message = value instanceof Error ? value.message : "Materyal hazırlanamadı. Daha sonra yeniden deneyebilirsin.";
        setError(!administrator && /OpenAI|API.?key|anahtar|sağlayıcı/i.test(message) ? "Materyal üretimi şu anda kullanılamıyor. Daha sonra yeniden deneyebilir veya öğretmeninden destek alabilirsin." : message);
      }
    } finally {
      if (createAbort.current === controller) { createAbort.current = null; setCreating(false); }
    }
  };

  const download = async (material: Material) => {
    const context = { ...currentContext.current };
    const controller = new AbortController(); downloadAbort.current = controller;
    setDownloading(material.id); setError(null);
    try {
      const response = await apiGet(`/atlas-materials/${material.id}/pdf`, { timeout: 60000, signal: controller.signal, retries: 0 });
      if (!response.ok) throw new Error(await errorMessage(response));
      const blob = await response.blob();
      if (controller.signal.aborted || currentContext.current.accountId !== context.accountId || currentContext.current.studentId !== context.studentId) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `atlas-${material.kind}-${material.id}.pdf`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (value) {
      if (!controller.signal.aborted && currentContext.current.accountId === context.accountId && currentContext.current.studentId === context.studentId) setError(value instanceof Error ? value.message : "PDF indirilemedi.");
    } finally {
      if (downloadAbort.current === controller) { downloadAbort.current = null; setDownloading(null); }
    }
  };

  return <section className={styles.panel} aria-label="AtlasAI PDF materyalleri">
    <div className={styles.heading}><div><span>ATLAS DERSLİK / ÖĞRENME MATERYALLERİ</span><h2>Dersine uygun, yanında hazır.</h2><p>Onaylı kazanımlardan konu anlatımı ve çalışma kâğıdı oluştur.</p></div><button onClick={() => void refresh()} disabled={loading || creating || needsStudent}><RefreshCw size={16} /> Yenile</button></div>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()} disabled={loading || creating}>Yeniden dene</button></div>}
    {atlas.role !== "STUDENT" && <label className={styles.field}>Öğrenci kapsamı<select value={studentId} disabled={creating || atlas.chatStudentsLoading} onChange={event => atlas.selectChatStudent(event.target.value)}><option value="">{atlas.chatStudentsLoading ? "Öğrenciler yükleniyor…" : atlas.role === "PARENT" ? "Öğrenci seç" : "Yetkili dersler"}</option>{atlas.chatStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>}
    {atlas.chatStudentsError && <p className={styles.error} role="alert">Öğrenci listesi alınamadı. <button type="button" onClick={() => void atlas.refreshChatStudents()}>Yeniden dene</button></p>}
    <div className={styles.template}><div className={styles.paper} aria-hidden="true"><Image src="/assets/images/deer-logo.png" alt="" width={23} height={23} /><strong>ATLAS DERSLİK</strong><span>KONU ANLATIMI</span><i /><i /><i /><b>ATLAS</b></div><div><span className={styles.badge}><ShieldCheck size={15} /> Ortak Atlas şablonu</span><h3>Bilgiye alan açan bir tasarım.</h3><p>A4 düzen, Atlas logosu, filigran, Türkçe yazı tipi, kaynak bilgisi, sayfa numarası ve ayrı cevap bölümü.</p><small>Üretilen içerik öğrenme desteğidir; öğretmen kontrolü önerilir.</small></div></div>
    {needsStudent ? <div className={styles.empty}><BookOpen size={26} /><h3>{atlas.chatStudentsLoading ? "Öğrencilerin yükleniyor." : "Önce öğrencini seç."}</h3><p>{!atlas.chatStudentsLoading && !atlas.chatStudents.length ? "Hesabına öğrenci bağlanması için kurum yöneticinden destek alabilirsin." : "Materyaller seçtiğin öğrencinin ders kapsamına göre hazırlanır."}</p></div>
      : loading ? <p className={styles.empty} role="status"><LoaderCircle size={20} /> Materyaller ve onaylı konular yükleniyor.</p>
        : !error && !topics.length ? <div className={styles.empty}><BookOpen size={26} /><h3>Dersine ait onaylı konular henüz hazır değil.</h3><p>{administrator ? "Konular ekranından sınıf, ders ve güncel resmî kaynak eşleşmesini kontrol ederek müfredat onayını tamamlayın." : "Materyal hazırlamak için kurumunun güncel müfredatı onaylaması gerekiyor. Öğretmeninden veya kurum yöneticinden destek alabilirsin."}</p>{administrator && <Link href="/admin/topics">Müfredat onayına git</Link>}</div>
          : !error && <>
            <div className={styles.form}><label className={styles.field}>Ders ve konu<select value={topicId} disabled={creating} onChange={event => setTopicId(event.target.value)}>{topics.map((item, index) => <option key={`${item.id}-${index}`} value={item.id}>{item.gradeLevel}. sınıf · {item.subject} · {item.name}</option>)}</select></label><label className={styles.field}>Materyal türü<select value={kind} disabled={creating} onChange={event => setKind(event.target.value as "lesson" | "worksheet")}><option value="lesson">Konu anlatımı ve örnekler</option><option value="worksheet">Çalışma kâğıdı ve alıştırmalar</option></select></label></div>
            {topic && <div className={styles.outcomes}><strong>{topic.version}</strong>{topic.outcomes.map(item => <p key={item.id}>{item.code} · {item.text}</p>)}<a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">{topic.sourceTitle}</a></div>}
            <button className={styles.primary} disabled={creating || !atlas.status?.materialGeneration || !topicId} onClick={() => void create()}>{creating ? <LoaderCircle size={17} className={styles.spin} /> : <FileText size={17} />}{creating ? "Materyal hazırlanıyor ve kazanımlar kontrol ediliyor…" : "PDF materyali hazırla"}</button>
            {!atlas.status?.materialGeneration && <p className={styles.note}>{!atlas.status ? "Materyal hizmeti kontrol ediliyor." : "Yeni materyal üretimi şu anda kullanılamıyor. Kaydedilmiş PDF'lerini indirebilirsin."} <button type="button" onClick={() => void atlas.refreshStatus()}>Durumu yenile</button>{administrator && <Link href="/admin">Yönetim durumunu kontrol et</Link>}</p>}
          </>}
    <div className={styles.saved}><h3>Materyallerim</h3>{loading ? <p role="status">Materyal listesi yükleniyor.</p> : !materials.length ? <p>{error ? "Materyal listesi doğrulanamadı. Yeniden denediğinde güncel kayıtların burada gösterilecek." : "Hazırladığın güncel materyaller burada görünür."}</p> : materials.map(item => <div key={item.id}><FileText size={20} /><span><strong>{item.title}</strong><small>{item.curriculum.subject} · {new Date(item.createdAt).toLocaleDateString("tr-TR")}</small></span><button disabled={!!downloading} onClick={() => void download(item)}>{downloading === item.id ? <LoaderCircle className={styles.spin} size={16} /> : <Download size={16} />} PDF indir</button></div>)}</div>
  </section>;
}
