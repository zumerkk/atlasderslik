"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { AtlasAILauncher } from "./atlas-ai-workspace";

export interface AtlasAction { label: string; href: string }
export interface AtlasMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    image?: string;
    hasImage?: boolean;
    generatedImage?: { dataUrl: string; alt: string };
    hadGeneratedImage?: boolean;
    actions?: AtlasAction[];
    contextUpdatedAt?: string;
}
interface AtlasStatus { available: boolean; vision: boolean; imageGeneration: boolean; message: string }
interface AtlasUser { id: string; firstName: string }
interface RecognitionEvent { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface Recognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: RecognitionEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
interface AtlasContextValue {
    role: string;
    name: string;
    accountId: string | null;
    mode: "chat" | "image";
    setMode: (mode: "chat" | "image") => void;
    messages: AtlasMessage[];
    draft: string;
    setDraft: (value: string) => void;
    attachment: string | null;
    setAttachment: (value: string | null) => void;
    loading: boolean;
    pending: AtlasMessage | null;
    error: string | null;
    setError: (error: string | null) => void;
    status: AtlasStatus | null;
    refreshStatus: () => Promise<void>;
    send: (prompt?: string) => Promise<void>;
    clear: () => void;
    cancel: () => void;
    getConversationRevision: () => number;
    open: boolean;
    setOpen: (value: boolean) => void;
    voiceEnabled: boolean;
    toggleVoice: () => void;
    speechSupported: boolean;
    recognitionSupported: boolean;
    listening: boolean;
    toggleListening: () => void;
    stopListening: () => void;
    speaking: boolean;
    replyAnimating: boolean;
    speak: (text: string) => void;
    stopSpeaking: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);
const STORAGE_PREFIX = "atlas-ai:session:";
const MAX_MESSAGES = 16;

function readUser(): AtlasUser | null {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const id = user?.id || user?._id || user?.email;
        return id ? { id: String(id), firstName: typeof user.firstName === "string" ? user.firstName : "" } : null;
    } catch { return null; }
}

export function safeAtlasHref(href: unknown, role: string): string | null {
    if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u0020]/.test(href)) return null;
    try {
        const url = new URL(href, window.location.origin);
        const prefix = `/${role.toLowerCase()}`;
        if (url.origin !== window.location.origin || !(url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return null;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch { return null; }
}

export function AtlasAIProvider({ children, role }: { children: ReactNode; role: string }) {
    const pathname = usePathname();
    const [user, setUser] = useState<AtlasUser | null>(null);
    const [messages, setMessages] = useState<AtlasMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [mode, setMode] = useState<"chat" | "image">("chat");
    const [attachment, setAttachment] = useState<string | null>(null);
    const [pending, setPending] = useState<AtlasMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<AtlasStatus | null>(null);
    const [open, setOpen] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [recognitionSupported, setRecognitionSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [replyAnimating, setReplyAnimating] = useState(false);
    const userRef = useRef<AtlasUser | null>(null);
    const requestRef = useRef(0);
    const busyRef = useRef(false);
    const voiceRef = useRef(false);
    const recognitionRef = useRef<Recognition | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const replyAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusRequestRef = useRef(0);
    const mountedRef = useRef(false);
    const chatAbortRef = useRef<AbortController | null>(null);
    const statusAbortRef = useRef<AbortController | null>(null);
    const visibleRef = useRef(false);
    const playbackEpoch = useRef(0);
    visibleRef.current = open || pathname.endsWith("/atlas-ai");

    const stopListening = useCallback(() => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (recognition) {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.abort();
        }
        setListening(false);
    }, []);

    const stopSpeaking = useCallback(() => {
        playbackEpoch.current += 1;
        if (utteranceRef.current) {
            utteranceRef.current.onstart = null;
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
        utteranceRef.current = null;
        setSpeaking(false);
    }, []);

    const speak = useCallback((text: string) => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, "").slice(0, 9000));
        utterance.lang = "tr-TR";
        utterance.rate = 1;
        const turkishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("tr"));
        if (turkishVoice) utterance.voice = turkishVoice;
        utterance.onstart = () => { if (utteranceRef.current === utterance) setSpeaking(true); };
        const finish = () => { if (utteranceRef.current === utterance) { setSpeaking(false); utteranceRef.current = null; } };
        utterance.onend = finish;
        utterance.onerror = finish;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const refreshStatus = useCallback(async () => {
        const statusRequest = ++statusRequestRef.current;
        const actorId = readUser()?.id;
        statusAbortRef.current?.abort();
        const controller = new AbortController();
        statusAbortRef.current = controller;
        try {
            const response = await apiGet("/atlas-ai/status", { timeout: 45000, retries: 0, signal: controller.signal });
            if (!response.ok) throw new Error("status");
            const data = await response.json();
            if (!mountedRef.current || statusRequest !== statusRequestRef.current || readUser()?.id !== actorId) return;
            setStatus({ available: data.available === true, vision: data.vision === true || data.supportsImages === true, imageGeneration: data.imageGeneration === true, message: typeof data.message === "string" ? data.message : "" });
        } catch {
            if (!mountedRef.current || controller.signal.aborted || statusRequest !== statusRequestRef.current || readUser()?.id !== actorId) return;
            setStatus({ available: false, vision: false, imageGeneration: false, message: "Atlas'a şu an ulaşamıyoruz. Bağlantıyı yeniden kontrol edebilirsin." });
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        const syncUser = () => {
            const nextUser = readUser();
            if (nextUser?.id === userRef.current?.id) return;
            const previousUser = userRef.current;
            chatAbortRef.current?.abort();
            requestRef.current += 1;
            busyRef.current = false;
            userRef.current = nextUser;
            setUser(nextUser);
            setDraft("");
            setMode("chat");
            setAttachment(null);
            setPending(null);
            setLoading(false);
            setError(null);
            setReplyAnimating(false);
            if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
            setVoiceEnabled(false);
            voiceRef.current = false;
            stopSpeaking();
            stopListening();
            setStatus(null);
            let restored: AtlasMessage[] = [];
            try {
                for (const key of Object.keys(sessionStorage)) {
                    if (key.startsWith(STORAGE_PREFIX) && key !== `${STORAGE_PREFIX}${nextUser?.id}`) sessionStorage.removeItem(key);
                }
                const saved: unknown = nextUser ? JSON.parse(sessionStorage.getItem(`${STORAGE_PREFIX}${nextUser.id}`) || "[]") : [];
                if (Array.isArray(saved)) {
                    restored = saved.filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string")
                        .slice(-MAX_MESSAGES).map((entry, index) => ({ id: `restored-${index}`, role: entry.role, content: entry.content.slice(0, 20000), hasImage: entry.hasImage === true, hadGeneratedImage: entry.hadGeneratedImage === true }));
                }
            } catch { /* Storage can be disabled in private browsing. */ }
            setMessages(restored);
            if (previousUser) void refreshStatus();
        };
        syncUser();
        window.addEventListener("storage", syncUser);
        setSpeechSupported("speechSynthesis" in window);
        const browser = window as VoiceWindow;
        setRecognitionSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
        void refreshStatus();
        return () => {
            window.removeEventListener("storage", syncUser);
            mountedRef.current = false;
            statusRequestRef.current += 1;
            requestRef.current += 1;
            chatAbortRef.current?.abort();
            statusAbortRef.current?.abort();
            stopListening();
            stopSpeaking();
            if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
            try {
                if (userRef.current && readUser()?.id !== userRef.current.id) sessionStorage.removeItem(`${STORAGE_PREFIX}${userRef.current.id}`);
            } catch { /* Storage may be unavailable. */ }
        };
    }, [refreshStatus, stopSpeaking, stopListening]);

    useEffect(() => {
        if (!user) return;
        try {
            sessionStorage.setItem(`${STORAGE_PREFIX}${user.id}`, JSON.stringify(messages.slice(-MAX_MESSAGES).map(({ role: messageRole, content, hasImage, generatedImage, hadGeneratedImage }) => ({ role: messageRole, content, hasImage, hadGeneratedImage: Boolean(generatedImage || hadGeneratedImage) }))));
        } catch { /* Keep the conversation in memory if storage is full. */ }
    }, [messages, user]);

    useEffect(() => {
        setOpen(false);
        stopSpeaking();
        stopListening();
    }, [pathname, stopSpeaking, stopListening]);

    const send = async (prompt?: string) => {
        const text = (prompt ?? draft).trim();
        if (busyRef.current || (!text && !attachment)) return;
        if (!userRef.current || readUser()?.id !== userRef.current.id) {
            setError("Oturumun değişti. Atlas'ı yeniden açmak için sayfayı yenile.");
            return;
        }
        if (text.length > 4000) { setError("Sorunu 4.000 karakterden kısa tutabilir misin?"); return; }
        if (mode === "image" && !status?.imageGeneration) { setError("Görsel oluşturma henüz etkin değil. Yöneticin görsel desteğini açtığında burada kullanabilirsin."); return; }
        if (attachment && !status?.vision) { setError("Görselli soru çözümü şu an kullanılamıyor. Soruyu yazarak gönderebilirsin."); return; }
        if (prompt !== undefined) setDraft(prompt);
        stopListening();
        stopSpeaking();
        const playbackRevision = playbackEpoch.current;
        setError(null);
        busyRef.current = true;
        setLoading(true);
        const requestId = ++requestRef.current;
        const controller = new AbortController();
        chatAbortRef.current = controller;
        const currentUserId = userRef.current.id;
        const currentImage = attachment;
        const history = messages.slice(-12);
        const lastImageIndex = !currentImage && mode === "chat" ? history.findLastIndex((message) => message.role === "user" && message.image) : -1;
        const userMessage: AtlasMessage = { id: `${Date.now()}-user`, role: "user", content: text || "Bu görseldeki soruyu adım adım açıklar mısın?", ...(currentImage ? { image: currentImage, hasImage: true } : {}) };
        setPending(userMessage);
        try {
            const response = await apiPost("/atlas-ai/chat", {
                message: userMessage.content,
                mode,
                history: history.map(({ role: messageRole, content, image }, index) => ({ role: messageRole, content: content.slice(0, 4000), ...(index === lastImageIndex && image ? { image } : {}) })),
                ...(currentImage ? { image: currentImage } : {}),
            }, { timeout: mode === "image" ? 180000 : 135000, retries: 0, signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const fallback = response.status === 429 ? "Biraz yoğunluk var. Sorun burada duruyor; kısa bir süre sonra tekrar gönderebilirsin." : "Yanıtı getiremedim. Sorun burada duruyor; tekrar deneyebilirsin.";
                throw new Error(typeof data.message === "string" ? data.message : fallback);
            }
            if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Yanıt boş geldi. Sorunu tekrar gönderebilirsin.");
            if (controller.signal.aborted || requestRef.current !== requestId || readUser()?.id !== currentUserId) return;
            const actions: AtlasAction[] = Array.isArray(data.actions) ? data.actions.slice(0, 6).flatMap((action: AtlasAction) => {
                const href = safeAtlasHref(action?.href, role);
                return href && typeof action.label === "string" ? [{ href, label: action.label.slice(0, 100) }] : [];
            }) : [];
            const answer: AtlasMessage = { id: `${Date.now()}-assistant`, role: "assistant", content: data.reply.slice(0, 20000), actions, contextUpdatedAt: typeof data.contextUpdatedAt === "string" ? data.contextUpdatedAt : undefined };
            if (typeof data.generatedImage?.dataUrl === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.generatedImage.dataUrl)) {
                answer.generatedImage = { dataUrl: data.generatedImage.dataUrl, alt: typeof data.generatedImage.alt === "string" ? data.generatedImage.alt.slice(0, 500) : "AtlasAI ile oluşturulan eğitim görseli" };
            }
            setMessages((previous) => [...previous, userMessage, answer].slice(-MAX_MESSAGES));
            setDraft("");
            setAttachment(null);
            setReplyAnimating(true);
            if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
            replyAnimationTimer.current = setTimeout(() => setReplyAnimating(false), 4500);
            if (voiceRef.current && playbackEpoch.current === playbackRevision && visibleRef.current && document.visibilityState === "visible") speak(answer.content);
        } catch (cause) {
            if (controller.signal.aborted || requestRef.current !== requestId || readUser()?.id !== currentUserId) return;
            setError(cause instanceof Error && cause.name !== "AbortError" && cause.name !== "TypeError" ? cause.message : "Bağlantı zaman aşımına uğradı. Sorunu sakladım; tekrar deneyebilirsin.");
        } finally {
            if (requestRef.current === requestId) { chatAbortRef.current = null; busyRef.current = false; setLoading(false); setPending(null); }
        }
    };

    const cancel = () => {
        requestRef.current += 1;
        chatAbortRef.current?.abort();
        chatAbortRef.current = null;
        busyRef.current = false;
        setLoading(false);
        setPending(null);
        setError("Yanıt durduruldu. Sorun burada duruyor; düzenleyip yeniden gönderebilirsin.");
        stopSpeaking();
    };

    const clear = () => {
        requestRef.current += 1;
        chatAbortRef.current?.abort();
        chatAbortRef.current = null;
        busyRef.current = false;
        setLoading(false);
        setPending(null);
        setMessages([]);
        setDraft("");
        setAttachment(null);
        setError(null);
        setReplyAnimating(false);
        if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
        stopSpeaking();
        stopListening();
        try { if (user) sessionStorage.removeItem(`${STORAGE_PREFIX}${user.id}`); } catch { }
    };

    const toggleListening = () => {
        if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
        const browser = window as VoiceWindow;
        const RecognitionConstructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
        if (!RecognitionConstructor || busyRef.current) return;
        stopSpeaking();
        const recognition = new RecognitionConstructor();
        const recognitionUserId = userRef.current?.id;
        recognition.lang = "tr-TR";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            if (recognitionRef.current !== recognition || readUser()?.id !== recognitionUserId) return;
            const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
            setDraft((previous) => `${previous}${previous ? " " : ""}${transcript}`.slice(0, 4000));
        };
        recognition.onerror = (event) => {
            if (recognitionRef.current !== recognition || readUser()?.id !== recognitionUserId) return;
            if (event.error !== "aborted") setError(event.error === "not-allowed" ? "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir veya sorunu yazabilirsin." : "Sesini duyamadım. Yeniden deneyebilir veya sorunu yazabilirsin.");
            setListening(false);
        };
        recognition.onend = () => {
            if (recognitionRef.current === recognition) { recognitionRef.current = null; setListening(false); }
        };
        recognitionRef.current = recognition;
        try { recognition.start(); setListening(true); setError(null); } catch { setError("Mikrofon açılamadı. Sorunu yazarak devam edebilirsin."); }
    };

    return <AtlasContext.Provider value={{ role, name: user?.firstName || "", accountId: user?.id || null, mode, setMode: (next) => { setMode(next); if (next === "image") setAttachment(null); setError(null); }, messages, draft, setDraft, attachment, setAttachment, loading, pending, error, setError, status, refreshStatus, send, clear, cancel, getConversationRevision: () => requestRef.current, open, setOpen: (next) => { visibleRef.current = next || pathname.endsWith("/atlas-ai"); setOpen(next); }, voiceEnabled, toggleVoice: () => { voiceRef.current = !voiceRef.current; setVoiceEnabled(voiceRef.current); if (!voiceRef.current) stopSpeaking(); }, speechSupported, recognitionSupported, listening, toggleListening, stopListening, speaking, replyAnimating, speak, stopSpeaking }}>
        {children}
        <AtlasAILauncher />
    </AtlasContext.Provider>;
}

export function useAtlasAI() {
    const context = useContext(AtlasContext);
    if (!context) throw new Error("AtlasAI must be used within AtlasAIProvider");
    return context;
}
