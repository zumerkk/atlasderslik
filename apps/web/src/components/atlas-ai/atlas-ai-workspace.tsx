"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDown, ArrowUpRight, AudioLines, BookOpen, CalendarDays, ChartNoAxesCombined, Check, ChevronRight, Copy, Download, ImagePlus, LoaderCircle, Maximize2, MessageCircle, Mic, MicOff, Palette, Plus, RotateCcw, Send, ShieldCheck, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { safeAtlasHref, useAtlasAI, type AtlasMessage } from "./atlas-ai-provider";
import { AtlasLearningPanel } from "./atlas-learning-panel";
import { AtlasMaterialsPanel } from "./atlas-materials-panel";
import { AtlasReply } from "./atlas-reply";
import styles from "./atlas-ai.module.css";

const STARTERS: Record<string, { title: string; description: string; prompt: string; icon: typeof BookOpen; target?: "insights" | "plan" }[]> = {
    STUDENT: [
        { title: "Bir soruyu çözelim", description: "Adım adım, anlayarak ilerle", prompt: "Bir soruyu birlikte adım adım çözmek istiyorum. Hazır mısın?", icon: BookOpen },
        { target: "insights", title: "Nasıl gidiyorum?", description: "İlerlemene birlikte bakalım", prompt: "Sistemdeki sınav sonuçlarım ve ödevlerime bakarak gelişimimi özetler misin? Önce hangi konuya odaklanmalıyım?", icon: ChartNoAxesCombined },
        { target: "plan", title: "Bugün ne çalışsam?", description: "Sana uygun bir çalışma planı", prompt: "Güncel ders programım ve ödevlerime göre bugün için uygulanabilir bir çalışma planı hazırlar mısın?", icon: CalendarDays },
        { title: "Bir konuyu anlat", description: "Zor görüneni kolaylaştıralım", prompt: "Anlamakta zorlandığım bir konuyu basit örneklerle öğrenmek istiyorum. Bana önce dersimi ve konuyu sorar mısın?", icon: Sparkles },
    ],
    ADMIN: [
        { title: "Sistemin nabzı", description: "Kurumun güncel görünümü", prompt: "Atlas Derslik sisteminin güncel durumunu; kullanıcılar, dersler ve kayıtlar açısından özetle. Dikkat etmem gereken noktalar neler?", icon: ChartNoAxesCombined },
        { title: "Ders planına bakalım", description: "Programı birlikte inceleyelim", prompt: "Erişebildiğin güncel ders programını ve yaklaşan canlı dersleri özetler misin? Eksik ayrıntıları belirt ve ders programı ekranına yönlendir.", icon: CalendarDays },
        { title: "Eğitimi geliştirelim", description: "Verilerden somut önerilere", prompt: "Sistemde erişebildiğin güncel verilere göre eğitim kalitemizi geliştirmek için öncelikli 3 somut adım öner.", icon: Sparkles },
        { title: "İşlemime yardım et", description: "Doğru ekrana birlikte gidelim", prompt: "Yeni bir öğrenci kaydı ve ders ataması için sistemde hangi ekranları kullanmalıyım? Adım adım yönlendir.", icon: BookOpen },
    ],
    TEACHER: [
        { title: "Dersime hazırlanayım", description: "Amaç, anlatım ve etkinlik", prompt: "Bir ders planı hazırlamak istiyorum. Ders, sınıf ve konuyu sorarak örnekli bir anlatım planı oluşturmama yardım et.", icon: BookOpen },
        { target: "insights", title: "Sınıflarım nasıl?", description: "Sınıf ve ödevlerinin görünümü", prompt: "Bana atanmış sınıfları, ödevlerimin teslim ve değerlendirme sayılarını özetle. Mevcut verilere göre takip etmem gereken bir durum var mı?", icon: ChartNoAxesCombined },
        { title: "Sıradaki derslerim", description: "Güncel programına göz at", prompt: "Güncel ders programımı ve yaklaşan canlı derslerimi özetler misin?", icon: CalendarDays },
        { title: "Soru hazırlayalım", description: "Seviyeye uygun özgün sorular", prompt: "Öğrencilerim için çözümlü alıştırma soruları hazırlayalım. Önce sınıf, ders, konu ve zorluk seviyesini sor.", icon: Sparkles },
    ],
    PARENT: [
        { target: "insights", title: "Çocuğum nasıl gidiyor?", description: "Gelişimini birlikte takip et", prompt: "Hesabıma bağlı öğrencilerin güncel sınav ve ödev durumunu özetle. Evde nasıl destek olabilirim?", icon: ChartNoAxesCombined },
        { title: "Ödevleri kontrol edelim", description: "Güncel sorumlulukları gör", prompt: "Çocuğumun mevcut ödevleri ve teslim durumları hakkında bilgi verir misin?", icon: BookOpen },
        { target: "plan", title: "Haftayı planlayalım", description: "Ders ve dinlenme dengesi", prompt: "Çocuğumun mevcut programına göre evde ders ve dinlenme dengesini nasıl kurabiliriz? Gerçekçi bir haftalık düzen öner.", icon: CalendarDays },
        { title: "Atlas'ta yolumu bulayım", description: "Aradığın bilgiye hızlıca ulaş", prompt: "Veli hesabımdan çocuğumun sınav sonuçlarını, ödevlerini ve destek ekranını nereden bulabilirim?", icon: Sparkles },
    ],
};

function AtlasMascot({ size = "normal", state = "idle" }: { size?: "small" | "normal" | "large"; state?: "idle" | "thinking" | "talking" | "listening" }) {
    return <div className={`${styles.mascot} ${styles[`mascot_${size}`]} ${styles[`mascot_${state}`]}`} aria-hidden="true">
        <div className={styles.mascotHalo} />
        <Image src="/atlas-icon.svg?v=atlas-book-20261120" alt="" width={256} height={256} className={styles.mascotImage} priority={size === "large"} unoptimized />
        <span className={styles.mascotStar}><Sparkles size={size === "small" ? 12 : 19} /></span>
        {(state === "talking" || state === "listening") && <div className={styles.voiceBars}><i /><i /><i /><i /><i /></div>}
    </div>;
}

function Message({ message }: { message: AtlasMessage }) {
    const atlas = useAtlasAI();
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setCopyError(false);
            copyTimer.current = setTimeout(() => setCopied(false), 1800);
        } catch { setCopyError(true); }
    };
    const date = message.contextUpdatedAt ? new Date(message.contextUpdatedAt) : null;
    const messageIndex = atlas.messages.findIndex(item => item.id === message.id);
    const question = message.role === "assistant" && !message.generatedImage
        ? atlas.messages.slice(Math.max(0, atlas.messages.length - 12), messageIndex).findLast(item => item.role === "user" && item.image)
        : null;
    return <article className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
        {message.role === "assistant" && <div className={styles.messageAvatar}><Sparkles size={15} /></div>}
        <div className={styles.messageBody}>
            <div className={styles.messageLabel}>{message.role === "user" ? "Sen" : <>Atlas<span>AI</span></>}</div>
            {message.image && <Image src={message.image} width={260} height={180} className={styles.messageImage} alt="Gönderdiğin soru görseli" unoptimized />}
            {!message.image && message.hasImage && <div className={styles.imageNote}><ImagePlus size={13} /> Görselli soru</div>}
            <AtlasReply content={message.content} role={atlas.role} />
            {question && <button type="button" className={styles.questionVisualButton} disabled={atlas.loading || atlas.studentSelectionRequired} onClick={() => atlas.prepareQuestionImage(question.id)}><Palette size={15} />Bu soru için görsel oluştur</button>}
            {message.generatedImage && <figure className={styles.generatedImage}><Image src={message.generatedImage.dataUrl} alt={message.generatedImage.alt} width={1024} height={1024} unoptimized /><figcaption><span>AtlasAI ile oluşturuldu</span><a href={message.generatedImage.dataUrl} download={`AtlasAI-gorsel-${message.id}.png`}><Download size={14} />Görseli indir</a></figcaption></figure>}
            {!message.generatedImage && message.hadGeneratedImage && <p className={styles.imageNote}>Bu yanıtta bir görsel oluşturuldu. Görseller yenilemeden sonra saklanmaz; yeniden oluşturabilirsin.</p>}
            {message.actions?.length ? <div className={styles.actions}>{message.actions.map((action, index) => {
                const href = safeAtlasHref(action.href, atlas.role);
                return href ? <Link href={href} key={`${href}-${index}`} onClick={() => atlas.setOpen(false)}>{action.label}<ArrowUpRight size={14} /></Link> : null;
            })}</div> : null}
            {message.role === "assistant" && <div className={styles.messageTools}>
                <button onClick={() => void copy()} title={copied ? "Kopyalandı" : "Yanıtı kopyala"} aria-label={copied ? "Yanıt kopyalandı" : "Yanıtı kopyala"}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
                {atlas.speechSupported && <button onClick={() => atlas.speaking ? atlas.stopSpeaking() : atlas.speak(message.content)} title={atlas.speaking ? "Sesi durdur" : "Yanıtı sesli dinle"} aria-label={atlas.speaking ? "Sesi durdur" : "Yanıtı sesli dinle"}>{atlas.speaking ? <Square size={13} /> : <Volume2 size={15} />}</button>}
                {date && !Number.isNaN(date.getTime()) && <span>Veriler {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>}
                {copyError && <span role="status">Metni seçerek kopyalayabilirsin.</span>}
            </div>}
        </div>
    </article>;
}

function Composer() {
    const atlas = useAtlasAI();
    const needsStudent = atlas.studentSelectionRequired;
    const messageInputId = useId();
    const fileRef = useRef<HTMLInputElement>(null);
    const imageReaderRef = useRef<FileReader | null>(null);
    const rotatingSourceRef = useRef<HTMLImageElement | null>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [readingImage, setReadingImage] = useState(false);
    const [rotatingImage, setRotatingImage] = useState(false);
    const imageBusy = readingImage || rotatingImage;
    const selectedTopic = atlas.chatTopics.find(topic => topic.id === atlas.selectedTopicId);
    const previousPhoto = atlas.messages.slice(-12).findLast(message => message.role === "user" && message.image);
    useEffect(() => () => {
        const reader = imageReaderRef.current; imageReaderRef.current = null; reader?.abort();
        const source = rotatingSourceRef.current; rotatingSourceRef.current = null;
        if (source) source.src = "";
    }, []);
    useEffect(() => {
        if (atlas.mode === "image" && atlas.attachment && !needsStudent) textRef.current?.focus();
    }, [atlas.mode, atlas.attachment, needsStudent]);
    const readImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (needsStudent) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { atlas.setError("JPEG, PNG veya WebP biçiminde bir soru görseli seç."); return; }
        if (file.size > 4 * 1024 * 1024) { atlas.setError("Görsel en fazla 4 MB olabilir. Daha küçük bir görsel seçebilirsin."); return; }
        setReadingImage(true);
        atlas.setError(null);
        const uploadToken = localStorage.getItem("token");
        const uploadRevision = atlas.getConversationRevision();
        const reader = new FileReader();
        imageReaderRef.current?.abort();
        imageReaderRef.current = reader;
        try {
            const data = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.onabort = reject; reader.readAsDataURL(file); });
            if (imageReaderRef.current !== reader || localStorage.getItem("token") !== uploadToken || atlas.getConversationRevision() !== uploadRevision) return;
            atlas.setAttachment(data);
            textRef.current?.focus();
        } catch {
            if (imageReaderRef.current === reader && localStorage.getItem("token") === uploadToken && atlas.getConversationRevision() === uploadRevision) atlas.setError("Görsel okunamadı. Başka bir dosya seçebilir misin?");
        } finally {
            if (imageReaderRef.current === reader) { imageReaderRef.current = null; setReadingImage(false); }
        }
    };
    const rotateImage = async () => {
        if (!atlas.attachment || needsStudent || atlas.loading || imageBusy) return;
        const token = localStorage.getItem("token");
        const revision = atlas.getConversationRevision();
        const source = new window.Image();
        rotatingSourceRef.current = source;
        const stillCurrent = () => rotatingSourceRef.current === source
            && localStorage.getItem("token") === token && atlas.getConversationRevision() === revision;
        setRotatingImage(true); atlas.setError(null);
        let reader: FileReader | null = null;
        try {
            await new Promise<void>((resolve, reject) => { source.onload = () => resolve(); source.onerror = () => reject(new Error("Fotoğraf açılamadı. Yeniden ekleyerek deneyebilirsin.")); source.src = atlas.attachment!; });
            if (!stillCurrent()) return;
            if (!source.naturalWidth || !source.naturalHeight) throw new Error("Fotoğrafın boyutları okunamadı. Başka bir görsel seçebilirsin.");
            const scale = Math.min(1, 4096 / Math.max(source.naturalWidth, source.naturalHeight));
            const width = Math.max(1, Math.round(source.naturalWidth * scale));
            const height = Math.max(1, Math.round(source.naturalHeight * scale));
            const canvas = document.createElement("canvas"); canvas.width = height; canvas.height = width;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Tarayıcın fotoğrafı döndüremedi. Farklı bir tarayıcıda deneyebilirsin.");
            context.fillStyle = "#ffffff"; context.fillRect(0, 0, height, width);
            context.translate(height / 2, width / 2); context.rotate(-Math.PI / 2);
            context.drawImage(source, -width / 2, -height / 2, width, height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
            canvas.width = 0; canvas.height = 0;
            if (!stillCurrent()) return;
            if (!blob) throw new Error("Fotoğraf döndürülemedi. Yeniden ekleyerek deneyebilirsin.");
            if (blob.size > 4 * 1024 * 1024) throw new Error("Döndürülen fotoğraf 4 MB sınırını aşıyor. Daha küçük bir fotoğraf ekleyebilirsin.");
            reader = new FileReader(); imageReaderRef.current = reader;
            const data = await new Promise<string>((resolve, reject) => { reader!.onload = () => resolve(String(reader!.result)); reader!.onerror = reject; reader!.onabort = reject; reader!.readAsDataURL(blob); });
            if (stillCurrent() && imageReaderRef.current === reader) atlas.setAttachment(data);
        } catch (error) {
            if (stillCurrent()) atlas.setError(error instanceof Error ? error.message : "Fotoğraf döndürülemedi. Yeniden deneyebilirsin.");
        } finally {
            source.onload = null; source.onerror = null;
            if (imageReaderRef.current === reader) imageReaderRef.current = null;
            if (rotatingSourceRef.current === source) { rotatingSourceRef.current = null; setRotatingImage(false); }
        }
    };
    return <div className={styles.composerArea}>
        <div className={styles.composerModes} role="group" aria-label="AtlasAI yanıt türü"><button type="button" aria-pressed={atlas.mode === "chat"} disabled={needsStudent || atlas.loading || imageBusy} onClick={() => atlas.setMode("chat")}><MessageCircle size={14} />Sohbet</button><button type="button" aria-pressed={atlas.mode === "image"} disabled={needsStudent || atlas.loading || imageBusy} onClick={() => atlas.setMode("image")}><Palette size={14} />Görsel oluştur</button></div>
        {atlas.mode === "image" && <div className={styles.imageModeNotice}><span>{atlas.status?.imageGeneration ? "Bir eğitim görseli tarif et veya soru fotoğrafını ekle." : "Görsel oluşturma şu anda kullanılamıyor. Bağlantıyı yenileyebilir veya sohbetle ilerleyebilirsin."}</span>{selectedTopic && <button type="button" disabled={needsStudent || atlas.loading} onClick={() => { atlas.setDraft(`${selectedTopic.name} konusunu açıklayan, önemli kavramları gösteren sade bir Türkçe eğitim görseli oluştur.`); textRef.current?.focus(); }}>{selectedTopic.name} konusunu görselleştir</button>}{!atlas.attachment && previousPhoto && <p>Son gönderdiğin soru fotoğrafı da bu görsel için kullanılacak.</p>}</div>}
        {atlas.error && <div className={styles.error} role="alert"><span>{atlas.error}</span>{(atlas.draft.trim() || atlas.attachment) && <button disabled={needsStudent || atlas.loading || imageBusy} onClick={() => void atlas.send()} className={styles.retryButton}>Tekrar gönder</button>}<button onClick={() => atlas.setError(null)} aria-label="Uyarıyı kapat"><X size={16} /></button></div>}
        {atlas.listening && <div className={styles.listeningNotice} role="status"><AudioLines size={16} /> Seni dinliyorum. Söylediklerin mesaj alanına eklenecek.</div>}
        <form className={`${styles.composer} ${atlas.listening ? styles.composerListening : ""}`} onSubmit={(event) => { event.preventDefault(); if (!imageBusy) void atlas.send(); }}>
            {atlas.attachment && <div className={styles.attachment}><Image src={atlas.attachment} alt="Gönderilecek soru görseli" width={52} height={52} unoptimized /><span>Soru görseli<small aria-live="polite">{rotatingImage ? "Döndürülüyor…" : "Mesajınla birlikte gönderilecek"}</small></span><button type="button" className={styles.rotateImageButton} disabled={needsStudent || atlas.loading || imageBusy} onClick={() => void rotateImage()} aria-label="Sola döndür" title="Fotoğrafı 90° sola döndür">{rotatingImage ? <LoaderCircle size={15} className={styles.spin} /> : <RotateCcw size={15} />}<span>Sola döndür</span></button><button type="button" onClick={() => atlas.setAttachment(null)} disabled={atlas.loading || imageBusy} aria-label="Görseli kaldır"><X size={15} /></button></div>}
            <label className={styles.srOnly} htmlFor={messageInputId}>Atlas&apos;a sorunu yaz</label>
            <textarea ref={textRef} id={messageInputId} rows={2} maxLength={4000} value={atlas.draft} disabled={needsStudent || atlas.loading} onChange={(event) => atlas.setDraft(event.target.value)} placeholder={needsStudent ? "Sohbete başlamak için yukarıdan öğrencini seç…" : atlas.mode === "image" ? "Hangi konuyu görselleştirelim? Sınıfı, konuyu ve istediğin görseli tarif et…" : atlas.role === "ADMIN" ? "Atlas'a sor; sistemi birlikte geliştirelim…" : "Aklındaki soruyu yaz, birlikte çözelim…"} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!imageBusy) void atlas.send(); } }} />
            <div className={styles.composerControls}>
                <div className={styles.composerTools}>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={needsStudent || atlas.loading || imageBusy} onChange={(event) => void readImage(event)} hidden />
                    <button type="button" className={styles.toolButton} disabled={needsStudent || atlas.loading || imageBusy} onClick={() => atlas.status?.vision ? fileRef.current?.click() : atlas.setError("Soru fotoğrafı şu anda eklenemiyor. Bağlantıyı yenileyebilir veya sorunu yazarak gönderebilirsin.")} title="Soru fotoğrafı ekle (JPEG, PNG, WebP; en fazla 4 MB)" aria-label="Soru görseli ekle">{imageBusy ? <LoaderCircle size={18} className={styles.spin} /> : <ImagePlus size={18} />}</button>
                    {atlas.recognitionSupported && <button type="button" className={`${styles.toolButton} ${atlas.listening ? styles.toolActive : ""}`} disabled={needsStudent || atlas.loading} onClick={atlas.toggleListening} aria-pressed={atlas.listening} title={atlas.listening ? "Mikrofonu kapat" : "Sorunu sesle yaz"} aria-label={atlas.listening ? "Mikrofonu kapat" : "Sorunu sesle yaz"}>{atlas.listening ? <MicOff size={18} /> : <Mic size={18} />}</button>}
                    <span className={styles.composerHint}>{atlas.draft.length > 3500 ? `${atlas.draft.length}/4000` : "Birlikte öğrenelim"}</span>
                </div>
                {atlas.loading ? <button key="stop" className={styles.stopButton} type="button" aria-label="Yanıtı beklemeyi durdur" onClick={(event) => { event.preventDefault(); atlas.cancel(); }}><Square size={14} />Durdur</button> : <button key="send" className={styles.sendButton} disabled={needsStudent || imageBusy || (!atlas.draft.trim() && !atlas.attachment)} type="submit" aria-label={atlas.mode === "image" ? "Eğitim görselini oluştur" : "Mesajı gönder"}><Send size={17} /><span>{atlas.mode === "image" ? "Oluştur" : "Gönder"}</span></button>}
            </div>
        </form>
        <p className={styles.composerFootnote}>Atlas bazen yanılabilir. Önemli bilgileri kontrol et. Görselleri saklamak için indir. {atlas.voiceEnabled ? "Ses, cihazının seslendirmesiyle okunur." : "Sohbet bu tarayıcı oturumunda tutulur."}</p>
    </div>;
}

function ThinkingResponse() {
    const atlas = useAtlasAI();
    const [waitSeconds, setWaitSeconds] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setWaitSeconds((seconds) => seconds + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    return <div className={styles.thinking} role="status"><AtlasMascot size="small" state="thinking" /><div><strong>{atlas.mode === "image" ? "Fikrini bir eğitim görseline dönüştürüyorum…" : waitSeconds > 45 ? "Sorunu dikkatle inceliyorum…" : waitSeconds > 12 ? "Bilgileri bir araya getiriyorum…" : "Birlikte düşünelim…"}</strong><span>{atlas.mode === "image" ? "Görselin hazırlanması birkaç dakika sürebilir." : waitSeconds > 45 ? "Biraz uzun sürdü, yanıtını hazırlamaya devam ediyorum." : "Sana özel bir yanıt hazırlıyorum."}</span><div className={styles.thinkingDots}><i /><i /><i /></div></div></div>;
}

function ChatPanel({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: (tab: "insights" | "plan") => void }) {
    const atlas = useAtlasAI();
    const scopeId = useId();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [awayFromBottom, setAwayFromBottom] = useState(false);
    const starters = STARTERS[atlas.role] || STARTERS.STUDENT;
    const administrator = ["ADMIN", "SUPERADMIN"].includes(atlas.role);
    const missingCurriculum = !atlas.studentSelectionRequired && !atlas.chatTopicsLoading && (!atlas.chatTopicsError && !atlas.chatTopics.length || /onaylı müfredat/.test(atlas.chatTopicsError || ""));
    const educationReady = !atlas.studentSelectionRequired && !atlas.chatTopicsLoading && !atlas.chatTopicsError && atlas.chatTopics.length > 0;
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = atlas.messages.length || atlas.loading ? scrollRef.current.scrollHeight : 0;
    }, [atlas.messages.length, atlas.loading]);
    return <section className={`${styles.chatPanel} ${compact ? styles.compact : ""}`} aria-label="AtlasAI sohbeti">
        <div className={styles.chatTopbar}>
            <div className={styles.chatIdentity}><div className={styles.brandIcon}><AtlasMascot size="small" state={atlas.speaking || atlas.replyAnimating ? "talking" : atlas.loading ? "thinking" : atlas.listening ? "listening" : "idle"} /></div><div><strong>Atlas<span>AI</span></strong><small><i className={atlas.status?.available && educationReady ? styles.onlineDot : styles.waitingDot} />{atlas.loading ? "Yanıtını hazırlıyor" : atlas.status?.available && educationReady ? "Birlikte öğrenmeye hazır" : atlas.status?.available ? "Ders kapsamı hazırlanıyor" : "Eğitim asistanın"}</small></div></div>
            <div className={styles.chatTopbarActions}>
                {atlas.speechSupported && <button className={`${styles.voiceToggle} ${atlas.voiceEnabled ? styles.voiceEnabled : ""}`} onClick={atlas.toggleVoice} aria-pressed={atlas.voiceEnabled} title={atlas.voiceEnabled ? "Sesli yanıtları kapat" : "Gelecek yanıtları sesli dinle"}>{atlas.voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>Sesli yanıt</span></button>}
                <button className={styles.newChat} onClick={atlas.clear} title="Yeni sohbet" aria-label="Yeni sohbet başlat"><Plus size={18} /><span>Yeni sohbet</span></button>
            </div>
        </div>
        <div className={styles.chatScopeControls} aria-label="Sohbetin öğrenci ve konu seçimi">
            {atlas.role !== "STUDENT" && <label htmlFor={`${scopeId}-student`}><span>{atlas.role === "PARENT" ? "Öğrencin" : "Öğrenci"}</span><select id={`${scopeId}-student`} value={atlas.selectedStudentId} disabled={atlas.chatStudentsLoading} onChange={(event) => atlas.selectChatStudent(event.target.value)} aria-required={atlas.role === "PARENT"}>
                <option value="">{atlas.chatStudentsLoading ? "Öğrenciler yükleniyor…" : atlas.role === "PARENT" ? "Öğrenci seç" : "Yetkili olduğum sınıflar"}</option>
                {atlas.chatStudents.map((student) => <option key={student.id} value={student.id}>{student.name}{student.classes.length ? ` · ${student.classes.join(", ")}` : ""}</option>)}
            </select></label>}
            <label htmlFor={`${scopeId}-topic`}><span>Konu <small>isteğe bağlı</small></span><select id={`${scopeId}-topic`} value={atlas.selectedTopicId} disabled={atlas.studentSelectionRequired || atlas.chatTopicsLoading || !!atlas.chatTopicsError || !atlas.chatTopics.length} onChange={(event) => atlas.selectChatTopic(event.target.value)}>
                <option value="">{atlas.chatTopicsLoading ? "Onaylı konular yükleniyor…" : atlas.studentSelectionRequired ? "Önce öğrencini seç" : !atlas.chatTopics.length ? "Onaylı konu bulunmuyor" : "Tüm onaylı konular"}</option>
                {atlas.chatTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.gradeLevel}. sınıf · {topic.subject} · {topic.name}</option>)}
            </select></label>
            {(atlas.chatStudentsError || atlas.chatTopicsError && !missingCurriculum) ? <p className={styles.chatScopeNotice} role="alert"><span>{atlas.chatStudentsError || "Ders konuları alınamadı. Bağlantıyı kontrol edip yeniden deneyebilirsin."}</span><button type="button" onClick={() => void (atlas.chatStudentsError ? atlas.refreshChatStudents() : atlas.refreshChatTopics())}>Yeniden dene</button></p> : <p className={styles.chatScopeNotice} role="status"><span>{atlas.studentSelectionRequired ? atlas.chatStudentsLoading ? "Öğrencilerin hazırlanıyor." : !atlas.chatStudents.length ? "Hesabına bağlı öğrenci bulunmuyor. Öğrenci bağlantısı için kurum yöneticinle görüşebilirsin." : "Eğitim sohbetine başlamak için öğrencini seç." : atlas.chatTopicsLoading ? "Dersine ait onaylı konular kontrol ediliyor." : missingCurriculum ? administrator ? "Ders soruları ve görseller için bu sınıfın güncel MEB kaynaklarıyla müfredat onayını tamamlayın." : "Ders soruları için kurumunun güncel müfredatı onaylaması gerekiyor. Öğretmeninden veya kurum yöneticinden destek alabilirsin." : "Yanıtlar seçili dersin onaylı kazanımlarıyla sınırlıdır. Her öğrenci ve konuya ait sohbet ayrı tutulur."}</span>{missingCurriculum && <button type="button" onClick={() => void atlas.refreshChatTopics()}>Konuları yenile</button>}{missingCurriculum && administrator && <Link href="/admin/topics">Müfredatı tamamla<ArrowUpRight size={12} /></Link>}</p>}
        </div>
        {atlas.status && !atlas.status.available && <div className={styles.statusBanner} role="status"><span>{administrator ? atlas.status.message || "AtlasAI kullanım durumunu yönetim ekranından kontrol edin." : atlas.status.connectionFailed ? "AtlasAI bağlantısı kurulamadı. Sorun burada duruyor; bağlantıyı yeniden kontrol edebilirsin." : "AtlasAI şu anda yeni yanıt hazırlayamıyor. Gelişim kayıtlarını inceleyebilir veya daha sonra yeniden deneyebilirsin."}</span><button onClick={() => void atlas.refreshStatus()}>Yenile</button></div>}
        <div className={styles.chatScroll} ref={scrollRef} onScroll={() => { const el = scrollRef.current; if (el) setAwayFromBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 180); }}>
            {!atlas.messages.length && !atlas.pending ? <div className={styles.welcome}>
                <AtlasMascot size={compact ? "normal" : "large"} state={atlas.listening ? "listening" : "idle"} />
                <span className={styles.welcomeEyebrow}>SENİN ATLAS&apos;IN, HER ADIMDA YANINDA</span>
                <h2>Merhaba{atlas.name ? ` ${atlas.name}` : ""}, ben Atlas<span>AI.</span></h2>
                <p>{atlas.role === "ADMIN" ? "Sistemi inceleyelim, eğitim için daha fazlasını birlikte yapalım. Nereden başlayalım?" : atlas.role === "PARENT" ? "Çocuğunun öğrenme yolculuğunu birlikte takip edelim. Bugün sana nasıl yardımcı olabilirim?" : "Bir soruyu çözelim, bir konuyu keşfedelim ya da birlikte plan yapalım. Bugün aklında ne var?"}</p>
                <div className={styles.starterGrid}>{starters.map((starter) => <button className={styles.starter} key={starter.title} onClick={() => starter.target && onNavigate ? onNavigate(starter.target) : void atlas.send(starter.prompt)} disabled={atlas.loading || (atlas.studentSelectionRequired && !(starter.target && onNavigate))}><span className={styles.starterIcon}><starter.icon size={18} /></span><span><strong>{starter.title}</strong><small>{starter.description}</small></span><ArrowUpRight size={16} className={styles.starterArrow} /></button>)}</div>
            </div> : <div className={styles.messages} role="log" aria-label="Sohbet mesajları" aria-live="polite" aria-relevant="additions">
                {atlas.messages.map((message) => <Message key={`${atlas.conversationScopeKey}:${message.id}`} message={message} />)}
                {atlas.pending && <Message message={atlas.pending} />}
                {atlas.loading && <ThinkingResponse />}
            </div>}
        </div>
        {awayFromBottom && Boolean(atlas.messages.length || atlas.pending) && <button className={styles.scrollToBottom} onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }} aria-label="Son mesaja git"><ArrowDown size={16} /></button>}
        <Composer key={atlas.conversationScopeKey} />
    </section>;
}

export function AtlasAIWorkspace() {
    const atlas = useAtlasAI();
    const [tab, setTab] = useState<"chat" | "insights" | "plan" | "materials">("chat");
    const tabId = useId();
    const tabs = [{ id: "chat" as const, label: "Sohbet", icon: MessageCircle }, { id: "insights" as const, label: atlas.role === "STUDENT" ? "Gelişimim" : atlas.role === "PARENT" ? "Çocuğumun gelişimi" : "Öğrenci gelişimi", icon: ChartNoAxesCombined }, { id: "plan" as const, label: atlas.role === "STUDENT" ? "Çalışma planım" : "Çalışma planı", icon: CalendarDays }, { id: "materials" as const, label: "PDF materyaller", icon: BookOpen }];
    const state = atlas.speaking || atlas.replyAnimating ? "talking" : atlas.listening ? "listening" : atlas.loading ? "thinking" : "idle";
    return <div className={styles.workspace}>
        <header className={styles.pageHeader}><div><div className={styles.eyebrow}><Sparkles size={14} /> ATLAS DERSLİK / ATLAS AI</div><h1>Birlikte, bir adım ileri<span>.</span></h1><p>Soruların, hedeflerin ve sana eşlik eden bir Atlas.</p></div><span className={styles.pageBadge}><ShieldCheck size={15} /> Sana özel öğrenme alanı</span></header>
        <div className={styles.workspaceTabs} role="tablist" aria-label="AtlasAI çalışma alanları">{tabs.map((item, index) => <button type="button" role="tab" key={item.id} id={`${tabId}-${item.id}-tab`} aria-controls={`${tabId}-${item.id}-panel`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => { setTab(item.id); atlas.stopSpeaking(); atlas.stopListening(); }} onKeyDown={(event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[next].id); document.getElementById(`${tabId}-${tabs[next].id}-tab`)?.focus(); }}><item.icon size={16} />{item.label}</button>)}</div>
        <div className={`${styles.workspaceGrid} ${tab !== "chat" ? styles.workspaceDataGrid : ""}`}>
            <div className={styles.workspaceMain}>
                <div role="tabpanel" id={`${tabId}-chat-panel`} aria-labelledby={`${tabId}-chat-tab`} hidden={tab !== "chat"}><ChatPanel onNavigate={setTab} /></div>
                <div role="tabpanel" id={`${tabId}-${tab === "plan" ? "plan" : "insights"}-panel`} aria-labelledby={`${tabId}-${tab === "plan" ? "plan" : "insights"}-tab`} hidden={tab === "chat" || tab === "materials"}><AtlasLearningPanel view={tab === "plan" ? "plan" : "insights"} onPlan={() => setTab("plan")} onAsk={(prompt, scope) => {
                    if (atlas.role !== "STUDENT" && !atlas.selectChatStudent(scope.studentId)) { setTab("chat"); return; }
                    atlas.selectChatTopic("");
                    if (scope.topic && (atlas.role === "STUDENT" || atlas.selectedStudentId === scope.studentId)) {
                        const topics = atlas.chatTopics.filter(topic => topic.name === scope.topic && topic.subject === scope.subject);
                        if (topics.length === 1) atlas.selectChatTopic(topics[0].id);
                    }
                    atlas.setMode("chat"); atlas.setDraft(prompt); setTab("chat");
                }} /></div>
                <div role="tabpanel" id={`${tabId}-materials-panel`} aria-labelledby={`${tabId}-materials-tab`} hidden={tab !== "materials"}><AtlasMaterialsPanel /></div>
            </div>
            <aside className={styles.companionRail}>
                <div className={styles.companionCard}><div className={styles.companionLabel}><span /><span>HER ADIMDA YANINDA</span><Sparkles size={15} /></div><AtlasMascot size="large" state={state} /><div className={styles.companionSpeech}>{atlas.speaking ? "Seni yanıtlıyorum…" : atlas.listening ? "Seni dinliyorum…" : atlas.loading ? "Hadi bunu birlikte çözelim." : "Merak ettiğin her şey, yeni bir başlangıç."}</div><h2>Sen sor.<br />Birlikte keşfedelim.</h2><p>Öğrenirken de plan yaparken de Atlas burada.</p><div className={styles.companionOrbit} /></div>
                <div className={styles.helpCard}><span className={styles.helpEyebrow}>ATLAS İLE NELER YAPABİLİRSİN?</span><div><BookOpen size={18} /><span><strong>Konuları anlayarak öğren</strong><small>Adım adım çözümler, sade örnekler.</small></span></div><div><ChartNoAxesCombined size={18} /><span><strong>Güncel durumunu gör</strong><small>Hesabındaki bilgilerle sana özel yanıtlar.</small></span></div><div><CalendarDays size={18} /><span><strong>Bir sonraki adımını bul</strong><small>Planlar, öneriler ve ilgili ekranlar.</small></span></div></div>
                {atlas.status?.vision && <div className={styles.tip}><ImagePlus size={18} /><p><strong>Yazmak yerine fotoğraf ekle.</strong> Sorunun net bir görselini yükle, birlikte inceleyelim.</p></div>}
            </aside>
        </div>
    </div>;
}

export function AtlasAILauncher() {
    const atlas = useAtlasAI();
    const pathname = usePathname();
    return <AtlasAILauncherContent key={`${atlas.accountId}:${pathname.endsWith("/atlas-ai")}`} />;
}

function AtlasAILauncherContent() {
    const atlas = useAtlasAI();
    const pathname = usePathname();
    const fullPage = pathname.endsWith("/atlas-ai");
    const commercePage = ["/admin/orders", "/admin/packages", "/student/packages", "/parent/packages"].includes(pathname);
    const [greeting, setGreeting] = useState(false);
    useEffect(() => {
        if (!atlas.accountId || fullPage || commercePage) return;
        try { if (sessionStorage.getItem(`atlas-ai:greeting:${atlas.accountId}`)) return; } catch { }
        const timer = setTimeout(() => setGreeting(true), 1800);
        return () => clearTimeout(timer);
    }, [atlas.accountId, fullPage, commercePage]);
    const dismissGreeting = () => { setGreeting(false); try { sessionStorage.setItem(`atlas-ai:greeting:${atlas.accountId}`, "seen"); } catch { } };
    if (fullPage || commercePage) return null;
    const close = (value: boolean) => { atlas.setOpen(value); if (value) dismissGreeting(); if (!value) { atlas.stopSpeaking(); atlas.stopListening(); } };
    return <Dialog.Root open={atlas.open} onOpenChange={close}>
        {greeting && !atlas.open && <div className={styles.greetingBubble}><button className={styles.greetingClose} onClick={dismissGreeting} aria-label="AtlasAI karşılama mesajını kapat"><X size={14} /></button><span>MERHABA, BEN ATLASAI</span><p>Sana nasıl yardımcı olabilirim?</p><button className={styles.greetingStart} onClick={() => close(true)}>Birlikte başlayalım<ArrowUpRight size={14} /></button></div>}
        <Dialog.Trigger asChild><button className={styles.launcher} aria-label="AtlasAI asistanını aç"><div className={styles.launcherCopy}><strong>Atlas<span>AI</span></strong><small>{atlas.loading ? "Yanıtını hazırlıyorum…" : atlas.replyAnimating ? "Yanıtın hazır!" : "Birlikte çözelim!"}</small></div><AtlasMascot size="small" state={atlas.loading ? "thinking" : atlas.speaking || atlas.replyAnimating ? "talking" : "idle"} /><span className={`${styles.launcherDot} ${!atlas.status?.available ? styles.launcherWaiting : ""}`} /></button></Dialog.Trigger>
        <Dialog.Portal><Dialog.Overlay className={styles.dialogOverlay} /><Dialog.Content className={styles.dialogContent}>
            <div className={styles.dialogHeading}><div><Dialog.Title>AtlasAI <span>• Eğitim asistanın</span></Dialog.Title><Dialog.Description className={styles.srOnly}>Sorularını yaz, görsel ekle veya Atlas ile öğrenme durumunu incele.</Dialog.Description></div><div><Link href={`/${atlas.role.toLowerCase()}/atlas-ai`} title="Tam sayfada aç" aria-label="AtlasAI tam sayfa aç" onClick={() => close(false)}><Maximize2 size={17} /></Link><Dialog.Close asChild><button aria-label="AtlasAI penceresini kapat"><X size={20} /></button></Dialog.Close></div></div>
            <ChatPanel compact />
            <Link className={styles.dialogFooter} href={`/${atlas.role.toLowerCase()}/atlas-ai`} onClick={() => close(false)}>AtlasAI çalışma alanına geç<ChevronRight size={14} /></Link>
        </Dialog.Content></Dialog.Portal>
    </Dialog.Root>;
}
