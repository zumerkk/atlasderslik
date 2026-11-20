"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { AtlasInsights } from "@repo/shared";
import { ArrowRight, BookOpen, CalendarDays, Check, Circle, Clock3, CloudCheck, CloudOff, Download, LoaderCircle, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAtlasAI } from "./atlas-ai-provider";
import { downloadAtlasPlan } from "./atlas-plan-calendar";
import { useAtlasStudyPlan } from "./use-atlas-study-plan";
import styles from "./atlas-ai.module.css";

const KIND_LABELS = { learn: "Konuyu öğren", practice: "Soru çöz", review: "Tekrar et", homework: "Ödev zamanı", break: "Mola" };
const istanbulDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function sameAccount(id: string | null): boolean {
    try { const user = JSON.parse(localStorage.getItem("user") || "null"); return id === String(user?.id || user?._id || user?.email || ""); } catch { return false; }
}

export function AtlasLearningPanel({ view, onPlan, onAsk }: { view: "insights" | "plan"; onPlan: () => void; onAsk: (prompt: string, scope: { studentId: string; subject?: string; topic?: string }) => void }) {
    const atlas = useAtlasAI();
    const selectorId = useId();
    const hourId = useId();
    const [insights, setInsights] = useState<AtlasInsights | null>(null);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dailyMinutes, setDailyMinutes] = useState(60);
    const [startHour, setStartHour] = useState(17);
    const [today, setToday] = useState(istanbulDate);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const fetchAbort = useRef<AbortController | null>(null);
    const student = insights?.students.find((item) => item.id === selectedId) || null;
    const study = useAtlasStudyPlan(atlas.accountId, selectedId);
    const { plan, completedBlockIds: completed, planning } = study;

    const refresh = useCallback(async (studentId?: string) => {
        const account = atlas.accountId;
        if (!account) return;
        fetchAbort.current?.abort();
        const controller = new AbortController();
        fetchAbort.current = controller;
        setLoading(true);
        setError(null);
        try {
            const response = await apiGet(`/atlas-ai/insights${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`, { timeout: 45000, retries: 0, signal: controller.signal });
            const data = await response.json();
            if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Öğrenme verileri alınamadı.");
            if (!Array.isArray(data.students) || !data.period) throw new Error("Öğrenme verileri okunamadı. Yeniden deneyebilirsin.");
            if (controller.signal.aborted || !sameAccount(account)) return;
            setInsights((previous) => studentId && previous ? { ...data, students: previous.students.map((item) => data.students.find((fresh: { id: string }) => fresh.id === item.id) || item) } : data);
            setSelectedId(data.selectedStudentId || data.students[0]?.id || "");
        } catch (cause) {
            if (!controller.signal.aborted && sameAccount(account)) setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Bağlantı kurulamadı. Yeniden deneyebilirsin.");
        } finally { if (!controller.signal.aborted && sameAccount(account)) setLoading(false); }
    }, [atlas.accountId]);

    useEffect(() => {
        setInsights(null);
        setSelectedId("");
        void refresh();
        return () => { fetchAbort.current?.abort(); };
    }, [refresh, atlas.accountId]);

    useEffect(() => {
        const timer = window.setInterval(() => setToday(istanbulDate()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => { setDownloadError(null); }, [plan?.id, selectedId]);

    const refreshAll = () => {
        void refresh(selectedId);
        void study.restore();
    };
    const createPlan = () => study.create(dailyMinutes, startHour);
    const todayPlan = plan?.days.find((day) => day.date === today);
    const focusDay = todayPlan || plan?.days.find((day) => day.date > today && day.blocks.some((block) => block.kind !== "break" && !completed.includes(block.id)));
    const focusBlocks = focusDay?.blocks.filter((block) => block.kind !== "break") || [];
    const focusBlock = focusBlocks.find((block) => !completed.includes(block.id));
    const focusCompleted = focusBlocks.filter((block) => completed.includes(block.id));
    const completedMinutes = focusCompleted.reduce((sum, block) => sum + block.minutes, 0);
    const focusFinished = focusBlocks.length > 0 && focusCompleted.length === focusBlocks.length;
    const planExpired = Boolean(plan && plan.days.every((day) => day.date < today));
    const totalBlocks = plan?.days.flatMap((day) => day.blocks).filter((block) => block.kind !== "break").length || 0;
    const progress = totalBlocks ? Math.round(completed.length / totalBlocks * 100) : 0;

    return <section className={styles.learningPanel} aria-label={view === "insights" ? "Öğrenme gelişimi" : "Kişisel çalışma planı"}>
        <div className={styles.learningHeader}><div><span className={styles.eyebrow}>VERİLERİNDEN BİR SONRAKİ ADIMINA</span><h2>{view === "insights" ? atlas.role === "STUDENT" ? "Öğrenme yolculuğun" : "Öğrenci gelişimi" : "Küçük adımlar, düzenli ilerleme."}</h2><p>{view === "insights" ? "Sınavlar, ödevler ve konu sonuçları birlikte." : "Derslere ve çalışma ihtiyaçlarına göre bir haftalık düzen."}</p></div><button className={styles.secondaryButton} onClick={refreshAll} disabled={loading || study.busy} aria-label="Öğrenme verilerini yenile"><RefreshCw size={15} className={loading ? styles.spin : ""} /><span>Yenile</span></button></div>
        {error && <div className={styles.error} role="alert"><span>{error}</span><button onClick={() => void refresh(selectedId)}>Tekrar dene</button></div>}
        {loading && !insights ? <div className={styles.learningEmpty} role="status"><LoaderCircle className={styles.spin} size={28} /><h3>Öğrenme verilerini bir araya getiriyorum.</h3><p>Sana ait güncel kayıtları kontrol ediyorum.</p></div> : insights && <>
            <div className={styles.studentSelector}>
                {insights.students.length > 1 ? <label htmlFor={selectorId}><span>{atlas.role === "PARENT" ? "Çocuğunu seç" : "Öğrenciyi seç"}</span><select id={selectorId} value={selectedId} disabled={loading || study.busy} onChange={(event) => { setSelectedId(event.target.value); void refresh(event.target.value); }}>{insights.students.map((item) => <option key={item.id} value={item.id}>{item.name}{item.classes.length ? ` · ${item.classes.join(", ")}` : ""}</option>)}</select></label> : student ? <div><strong>{student.name}</strong><span>{student.classes.join(" · ") || "Öğrenme profili"}</span></div> : null}
                <span className={styles.periodPill}><Clock3 size={13} />{insights.period.label}</span>
            </div>
            {!student ? <div className={styles.learningEmpty}><BookOpen size={32} /><h3>Henüz bağlı bir öğrenci görünmüyor.</h3><p>{atlas.role === "PARENT" ? "Öğrenci bağlantısı tamamlandığında çocuğunun gelişimini burada takip edebilirsin." : atlas.role === "TEACHER" ? "Sınıf ve öğrenci atamaları tamamlandığında gelişim bilgileri burada görünecek." : "Öğrenci kayıtları ve ders atamaları tamamlandığında bu alan hazır olacak."}</p></div> : loading || error ? <div className={styles.learningEmpty} role="status">{loading ? <LoaderCircle size={26} className={styles.spin} /> : <RefreshCw size={26} />}<h3>{loading ? "Güncel kayıtları kontrol ediyorum." : "Güncel veriler doğrulanamadı."}</h3><p>{loading ? "Seçili öğrencinin bilgileri hazırlanıyor." : "Önceki verileri göstermeden önce bağlantıyı yeniden kontrol etmem gerekiyor. Yenile düğmesiyle tekrar deneyebilirsin."}</p></div> : view === "insights" ? <>
                <div className={styles.metricGrid}>
                    <div><span>Tamamlanan test</span><strong>{student.metrics.completedTests}<small>test</small></strong><BookOpen size={18} /></div>
                    <div><span>Teslim edilen ödev</span><strong>{student.metrics.submittedAssignments}<small>ödev</small></strong><Check size={18} /></div>
                    <div><span>Ortalama puan</span><strong>{student.metrics.averageScore === null ? "—" : Math.round(student.metrics.averageScore)}<small>/ 100</small></strong><Target size={18} /></div>
                    <div><span>Önceki döneme göre</span><strong>{student.metrics.scoreChange === null ? "—" : `${student.metrics.scoreChange > 0 ? "+" : ""}${Math.round(student.metrics.scoreChange)}`}<small>puan</small></strong><TrendingUp size={18} /></div>
                </div>
                <div className={styles.evidenceNote}><Sparkles size={17} /><div><strong>{student.evidence.limited ? "Biraz daha veriyle seni daha iyi tanıyacağım." : "Bu görünüm kayıtlı sonuçlara dayanıyor."}</strong><p>{student.evidence.analyzedTests} test ve {student.evidence.analyzedQuestions} soru incelendi. {student.evidence.notes.join(" ")}</p></div></div>
                <div className={styles.sectionHeading}><div><h3>Hangi konuya odaklanmalı?</h3><p>Yanlış ve boş sorular, bir sonraki çalışma adımının ipucu.</p></div><button className={styles.textButton} onClick={onPlan}>Planımı oluştur<ArrowRight size={15} /></button></div>
                {student.topics.length ? <div className={styles.topicList}>{student.topics.map((topic) => <article className={styles.topicRow} key={topic.key}><div className={`${styles.topicIcon} ${styles[`priority_${topic.priority}`]}`}><BookOpen size={18} /></div><div className={styles.topicDetails}><strong>{topic.topic}</strong><span>{topic.subject} · {topic.attempts} soru · {topic.correct} doğru, {topic.wrong} yanlış, {topic.empty} boş</span><div className={styles.accuracyTrack} role="meter" aria-label={`${topic.topic} doğruluk oranı`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(topic.accuracy)}><i style={{ width: `${Math.max(0, Math.min(100, topic.accuracy))}%` }} /></div></div><div className={styles.topicScore}><strong>%{Math.round(topic.accuracy)}</strong><span>{topic.priority === "focus" ? "Öncelikli" : topic.priority === "practice" ? "Pekiştir" : "Güçlü"}</span><small>{topic.confidence === "limited" ? "Az veri" : topic.confidence === "developing" ? "Gelişen veri" : "Yeterli veri"}</small></div></article>)}</div> : <div className={styles.dataEmpty}>Konu düzeyinde henüz yeterli soru kaydı yok. Bir test tamamlandığında konu öncelikleri burada oluşacak.</div>}
                <div className={styles.sectionHeading}><div><h3>Yaklaşan sorumluluklar</h3><p>Planına yer açabileceğin ödevler.</p></div></div>
                {student.upcomingAssignments.length ? <div className={styles.assignmentList}>{student.upcomingAssignments.map((assignment, index) => <div key={`${assignment.title}-${index}`}><span className={styles.assignmentIcon}>{assignment.submitted ? <Check size={17} /> : <CalendarDays size={17} />}</span><div><strong>{assignment.title}</strong><span>{assignment.subject} · {new Date(assignment.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" })}</span></div><small>{assignment.submitted ? "Teslim edildi" : "Bekliyor"}</small></div>)}</div> : <div className={styles.dataEmpty}>Bu görünümde yaklaşan ödev kaydı bulunmuyor.</div>}
                <button className={styles.askInsights} onClick={() => onAsk(atlas.role === "STUDENT" ? "Bu ayki sınav ve ödev sonuçlarıma göre neleri geliştirdim, önce hangi konulara odaklanmalıyım?" : `${student.name} adlı öğrencinin gelişimini değerlendirirken nelere dikkat etmeliyim? Veriye dayalı bir açıklama ve uygulanabilir öneriler istiyorum.`, { studentId: student.id })}><Sparkles size={17} />Atlas ile bu sonuçları konuş<ArrowRight size={16} /></button>
            </> : <>
                <div className={styles.planControls}><fieldset><legend>Her gün ne kadar çalışalım?</legend><div>{[30, 60, 90].map((minutes) => <button type="button" key={minutes} aria-pressed={dailyMinutes === minutes} className={dailyMinutes === minutes ? styles.durationActive : ""} disabled={study.busy} onClick={() => setDailyMinutes(minutes)}>{minutes}<span>dk</span></button>)}</div></fieldset><label htmlFor={hourId}>Başlangıç saati<select id={hourId} value={startHour} disabled={study.busy} onChange={(event) => setStartHour(Number(event.target.value))}>{Array.from({ length: 13 }, (_, index) => index + 8).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><button className={styles.primaryButton} disabled={study.busy || loading || Boolean(study.restoreError)} onClick={() => void createPlan()}>{planning ? <LoaderCircle size={17} className={styles.spin} /> : <Sparkles size={17} />}{planning ? "Plan hazırlanıyor…" : plan ? "Yeni plan oluştur" : "Haftamı planla"}</button></div>
                {study.restoreError && <div className={styles.error} role="alert"><span>{study.restoreError} Yeni plan oluşturmadan önce kayıtlı planını kontrol edelim.</span><button onClick={() => void study.restore()} disabled={study.busy}>Yeniden yükle</button></div>}
                {study.planError && <div className={styles.error} role="alert"><span>{study.planError}</span><button onClick={() => void createPlan()} disabled={study.busy}>Tekrar dene</button></div>}
                {study.progressError && <div className={styles.error} role="alert"><span>{study.progressError} İşaretin kaydedildiği doğrulanmadı.</span><button onClick={() => void study.retrySave()} disabled={study.busy}>Kaydı yeniden dene</button></div>}
                {downloadError && <div className={styles.error} role="alert"><span>{downloadError}</span></div>}
                {study.restoring ? <div className={styles.learningEmpty} role="status"><LoaderCircle size={28} className={styles.spin} /><h3>Kaldığın yeri hatırlıyorum.</h3><p>Kayıtlı planını ve tamamladığın çalışmaları getiriyorum.</p></div> : study.restoreError ? null : <>
                {(plan || study.notice) && <div className={styles.planSync} role="status" aria-live="polite">{study.pendingBlockId ? <LoaderCircle size={16} className={styles.spin} /> : study.progressError || study.planError ? <CloudOff size={16} /> : <CloudCheck size={16} />}<span>{study.pendingBlockId ? "İlerlemen kaydediliyor…" : study.progressError || study.planError ? "Son değişikliğin kaydı doğrulanamadı. Önceki kayıt gösteriliyor." : study.notice || "Planın ve ilerlemen hesabına kaydedildi."}{!study.pendingBlockId && study.updatedAt && <small>Son kayıt: {new Date(study.updatedAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</small>}</span></div>}
                {plan && <div className={`${styles.todayFocus} ${focusFinished ? styles.focusFinished : ""}`}>
                    <div className={styles.focusHeading}><span><Target size={16} />{focusDay?.date === today ? "BUGÜNÜN ODAĞI" : planExpired ? "YENİ BİR HAFTAYA HAZIR MISIN?" : "BİR SONRAKİ ADIMIN"}</span>{focusDay && <small>{new Date(`${focusDay.date}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" })}</small>}</div>
                    <h3>{focusFinished ? "Planındaki bu günü tamamladın!" : focusBlock ? focusBlock.topic : planExpired ? "Bu planın tarihleri tamamlandı." : "Bugünün programında boşluk yok."}</h3>
                    <p>{focusFinished ? "Küçük adımlar birikti. Kendine bir mola ver; sonraki çalışmanda burada devam edebilirsin." : focusBlock ? focusBlock.activity : planExpired ? "Yeni sonuçlarını da değerlendirerek kendine yeni bir hafta hazırlayabilirsin." : "Derslerin ve mevcut programın dikkate alındı. Haftanın diğer günlerini aşağıdan görebilirsin."}</p>
                    {focusBlock && <div className={styles.focusMeta}><span><Clock3 size={14} />{focusBlock.startTime}–{focusBlock.endTime} · {focusBlock.minutes} dk</span><span>{focusBlock.subject} · {KIND_LABELS[focusBlock.kind]}</span></div>}
                    {focusBlocks.length > 0 && <div className={styles.focusFooter}><span><strong>{focusCompleted.length}/{focusBlocks.length}</strong> çalışma işaretlendi · {completedMinutes} dk</span>{focusBlock && <button onClick={() => onAsk(`${focusBlock.subject} dersinde ${focusBlock.topic} konusuna çalışıyorum. Planımdaki etkinlik: ${focusBlock.activity} Önce kısa bir anlatım yap, sonra cevabını hemen vermeden bir alıştırmayla bana yol göster.`, { studentId: student.id, subject: focusBlock.subject, topic: focusBlock.topic })} disabled={study.busy}><Sparkles size={14} />Atlas ile çalış<ArrowRight size={14} /></button>}</div>}
                </div>}
                {plan ? <><div className={styles.planSummary}><div><span className={styles.eyebrow}>SANA ÖZEL HAFTALIK RİTİM</span><h3>{plan.title}</h3><p>{plan.summary}</p></div><button className={styles.secondaryButton} onClick={() => { try { downloadAtlasPlan(plan); } catch { setDownloadError("Takvim dosyası oluşturulamadı. Yeniden indirmeyi deneyebilirsin."); } }}><Download size={15} />Takvime indir</button></div><div className={styles.planProgress}><span><strong>{completed.length}/{totalBlocks}</strong> çalışma tamamlandı</span><span>%{progress}</span><progress max={100} value={progress} aria-label="Haftalık çalışma tamamlanma oranı" /></div><div className={styles.planDays}>{plan.days.map((day) => <article className={`${styles.planDay} ${day.date === today ? styles.todayPlanDay : ""}`} key={day.date} aria-current={day.date === today ? "date" : undefined}><header><div><span>{new Date(`${day.date}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" })}</span><h4>{day.label}{day.date === today && <em>Bugün</em>}</h4></div><small>{day.blocks.reduce((sum, block) => sum + block.minutes, 0)} dk</small></header>{!day.blocks.length && <p className={styles.dayEmpty}>Bugün için uygun bir çalışma aralığı bulunamadı. Başlangıç saatini değiştirerek yeni bir plan hazırlayabilirsin.</p>}{day.blocks.map((block) => <div className={`${styles.planBlock} ${block.kind === "break" ? styles.breakBlock : ""} ${completed.includes(block.id) ? styles.blockComplete : ""}`} key={block.id}>{block.kind !== "break" ? <button className={styles.blockCheck} aria-pressed={completed.includes(block.id)} aria-label={`${day.label}, ${block.topic}: ${completed.includes(block.id) ? "tamamlandı işaretini kaldır" : "tamamlandı olarak işaretle"}`} disabled={study.busy} onClick={() => void study.toggleBlock(block.id)}>{study.pendingBlockId === block.id ? <LoaderCircle size={16} className={styles.spin} /> : completed.includes(block.id) ? <Check size={16} /> : <Circle size={16} />}</button> : <Clock3 className={styles.breakIcon} size={16} />}<div><span className={styles.blockTime}>{block.startTime}–{block.endTime} · {KIND_LABELS[block.kind]}</span><strong>{block.kind === "break" ? "Bir nefes molası" : block.topic}</strong>{block.kind !== "break" && <span className={styles.blockSubject}>{block.subject}</span>}<p>{block.activity}</p>{block.reason && block.kind !== "break" && <details><summary>Neden bu çalışma?</summary><p>{block.reason}</p></details>}</div></div>)}</article>)}</div>{plan.notes.length > 0 && <div className={styles.planNotes}>{plan.notes.map((note, index) => <p key={index}>{note}</p>)}</div>}<p className={styles.localNotice}>Planın hesabına özeldir; tekrar giriş yaptığında kaldığın yerden devam edebilirsin. İlerleme, senin tamamlandı işaretlerine göre hesaplanır. Yeni plan oluşturmak mevcut planın ve işaretlerinin yerini alır.</p></> : <div className={styles.planWelcome}><div><CalendarDays size={34} /></div><h3>Bu hafta için sana yer açalım.</h3><p>Günlük süreni seç. Kayıtlı ders programı, ödevler ve konu sonuçlarından dengeli bir plan hazırlayalım.</p><span>Öğren · Uygula · Tekrar et · Dinlen</span></div>}
                </>}
            </>}
        </>}
    </section>;
}
