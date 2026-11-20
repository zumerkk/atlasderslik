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
interface AtlasStatus { available: boolean; vision: boolean; imageGeneration: boolean; materialGeneration: boolean; message: string; connectionFailed?: boolean }
interface AtlasUser { id: string; firstName: string }
export interface AtlasChatStudent { id: string; name: string; classes: string[] }
export interface AtlasChatTopic { id: string; name: string; subject: string; gradeId: string; gradeLevel: number }
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
    chatStudents: AtlasChatStudent[];
    chatStudentsLoading: boolean;
    chatStudentsError: string | null;
    selectedStudentId: string;
    selectChatStudent: (studentId: string) => boolean;
    refreshChatStudents: () => Promise<void>;
    chatTopics: AtlasChatTopic[];
    chatTopicsLoading: boolean;
    chatTopicsError: string | null;
    selectedTopicId: string;
    selectChatTopic: (topicId: string) => void;
    refreshChatTopics: () => Promise<void>;
    studentSelectionRequired: boolean;
    conversationScopeKey: string;
    mode: "chat" | "image";
    setMode: (mode: "chat" | "image") => void;
    prepareQuestionImage: (messageId: string) => void;
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
const STORAGE_PREFIX = "atlas-ai:session:v2:";
const MAX_MESSAGES = 16;

function conversationKey(accountId: string, studentId = "", topicId = "") {
    return `${STORAGE_PREFIX}${encodeURIComponent(accountId)}:${encodeURIComponent(studentId || "account")}:${encodeURIComponent(topicId || "all")}`;
}

function restoreConversation(key: string): AtlasMessage[] {
    try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(key) || "[]");
        if (!Array.isArray(saved)) return [];
        return saved.filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string")
            .slice(-MAX_MESSAGES).map((entry, index) => ({ id: `restored-${index}`, role: entry.role, content: entry.content.slice(0, 20000), hasImage: entry.hasImage === true, hadGeneratedImage: entry.hadGeneratedImage === true }));
    } catch { return []; }
}

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
    const [chatStudents, setChatStudents] = useState<AtlasChatStudent[]>([]);
    const [chatStudentsLoading, setChatStudentsLoading] = useState(false);
    const [chatStudentsError, setChatStudentsError] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [chatTopics, setChatTopics] = useState<AtlasChatTopic[]>([]);
    const [chatTopicsLoading, setChatTopicsLoading] = useState(false);
    const [chatTopicsError, setChatTopicsError] = useState<string | null>(null);
    const [selectedTopicId, setSelectedTopicId] = useState("");
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
    const studentListAbortRef = useRef<AbortController | null>(null);
    const studentListRequestRef = useRef(0);
    const topicListAbortRef = useRef<AbortController | null>(null);
    const topicListRequestRef = useRef(0);
    const chatScopeRef = useRef({ accountId: "", studentId: "", topicId: "", key: "" });
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

    const changeConversationScope = useCallback((studentId: string, topicId = "") => {
        const actorId = userRef.current?.id || "";
        const key = actorId ? conversationKey(actorId, studentId, topicId) : "";
        if (chatScopeRef.current.key === key) return;
        chatAbortRef.current?.abort();
        chatAbortRef.current = null;
        requestRef.current += 1;
        busyRef.current = false;
        chatScopeRef.current = { accountId: actorId, studentId, topicId, key };
        setSelectedStudentId(studentId);
        setSelectedTopicId(topicId);
        setMessages(key && !(role === "PARENT" && !studentId) ? restoreConversation(key) : []);
        setDraft("");
        setAttachment(null);
        setPending(null);
        setLoading(false);
        setError(null);
        setReplyAnimating(false);
        if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
        stopListening();
        stopSpeaking();
    }, [role, stopListening, stopSpeaking]);

    const refreshChatStudents = useCallback(async () => {
        const actorId = userRef.current?.id;
        studentListAbortRef.current?.abort();
        const revision = ++studentListRequestRef.current;
        if (!actorId || role === "STUDENT") { setChatStudents([]); setChatStudentsLoading(false); setChatStudentsError(null); return; }
        const controller = new AbortController(); studentListAbortRef.current = controller;
        setChatStudentsLoading(true); setChatStudentsError(null);
        try {
            const response = await apiGet("/atlas-ai/insights", { retries: 0, signal: controller.signal });
            const data = await response.json();
            if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Öğrenci listesi alınamadı.");
            if (!mountedRef.current || controller.signal.aborted || revision !== studentListRequestRef.current || readUser()?.id !== actorId) return;
            const rows: AtlasChatStudent[] = Array.isArray(data.students) ? data.students.filter((item: AtlasChatStudent) => typeof item?.id === "string" && typeof item?.name === "string").map((item: AtlasChatStudent) => ({ id: item.id, name: item.name, classes: Array.isArray(item.classes) ? item.classes.filter(value => typeof value === "string") : [] })) : [];
            setChatStudents(rows);
            const selected = chatScopeRef.current.studentId;
            if (selected && !rows.some(row => row.id === selected)) changeConversationScope("");
            if (role === "PARENT" && rows.length === 1 && selected !== rows[0].id) changeConversationScope(rows[0].id);
        } catch (cause) {
            if (!mountedRef.current || controller.signal.aborted || revision !== studentListRequestRef.current || readUser()?.id !== actorId) return;
            setChatStudentsError(cause instanceof Error ? cause.message : "Öğrenci listesi alınamadı.");
        } finally {
            if (revision === studentListRequestRef.current && !controller.signal.aborted) setChatStudentsLoading(false);
        }
    }, [role, changeConversationScope]);

    const refreshChatTopics = useCallback(async () => {
        const actorId = userRef.current?.id;
        const studentId = chatScopeRef.current.studentId;
        topicListAbortRef.current?.abort();
        const revision = ++topicListRequestRef.current;
        if (!actorId || (role === "PARENT" && !studentId)) { setChatTopics([]); setChatTopicsLoading(false); setChatTopicsError(null); return; }
        const controller = new AbortController(); topicListAbortRef.current = controller;
        setChatTopicsLoading(true); setChatTopicsError(null); setChatTopics([]);
        try {
            const response = await apiGet(`/atlas-ai/curriculum/scope${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`, { retries: 0, signal: controller.signal });
            const data = await response.json();
            if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Onaylı konular alınamadı.");
            if (!mountedRef.current || controller.signal.aborted || revision !== topicListRequestRef.current || readUser()?.id !== actorId || chatScopeRef.current.studentId !== studentId) return;
            const topics: AtlasChatTopic[] = Array.isArray(data.topics) ? data.topics.filter((item: AtlasChatTopic) => typeof item?.id === "string" && typeof item?.name === "string" && typeof item?.subject === "string") : [];
            setChatTopics(topics);
            if (chatScopeRef.current.topicId && !topics.some(topic => topic.id === chatScopeRef.current.topicId)) changeConversationScope(studentId);
        } catch (cause) {
            if (!mountedRef.current || controller.signal.aborted || revision !== topicListRequestRef.current || readUser()?.id !== actorId || chatScopeRef.current.studentId !== studentId) return;
            setChatTopicsError(cause instanceof Error ? cause.message : "Onaylı konular alınamadı.");
        } finally {
            if (revision === topicListRequestRef.current && !controller.signal.aborted) setChatTopicsLoading(false);
        }
    }, [role, changeConversationScope]);

    const selectChatStudent = useCallback((studentId: string) => {
        if (studentId && !chatStudents.some(student => student.id === studentId)) { setError("Erişebildiğin öğrencilerden birini seç. Öğrenci listesini yenileyip tekrar deneyebilirsin."); return false; }
        const studentChanged = chatScopeRef.current.studentId !== studentId;
        changeConversationScope(studentId);
        if (studentChanged) { setChatTopics([]); setChatTopicsError(null); }
        return true;
    }, [chatStudents, changeConversationScope]);

    const selectChatTopic = useCallback((topicId: string) => {
        if (topicId && !chatTopics.some(topic => topic.id === topicId)) { setError("Onaylı konulardan birini seç."); return; }
        changeConversationScope(chatScopeRef.current.studentId, topicId);
    }, [chatTopics, changeConversationScope]);

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
            setStatus({ available: data.available === true, vision: data.vision === true || data.supportsImages === true, imageGeneration: data.imageGeneration === true, materialGeneration: data.materialGeneration === true, message: typeof data.message === "string" ? data.message : "", connectionFailed: false });
        } catch {
            if (!mountedRef.current || controller.signal.aborted || statusRequest !== statusRequestRef.current || readUser()?.id !== actorId) return;
            setStatus({ available: false, vision: false, imageGeneration: false, materialGeneration: false, message: "Atlas'a şu an ulaşamıyoruz. Bağlantıyı yeniden kontrol edebilirsin.", connectionFailed: true });
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        const syncUser = () => {
            const nextUser = readUser();
            if (nextUser?.id === userRef.current?.id) { if (nextUser) void refreshChatStudents(); return; }
            const previousUser = userRef.current;
            chatAbortRef.current?.abort();
            requestRef.current += 1;
            busyRef.current = false;
            userRef.current = nextUser;
            setUser(nextUser);
            studentListAbortRef.current?.abort(); studentListRequestRef.current += 1;
            topicListAbortRef.current?.abort(); topicListRequestRef.current += 1;
            setChatStudents([]); setChatStudentsError(null); setChatStudentsLoading(false);
            setChatTopics([]); setChatTopicsError(null); setChatTopicsLoading(false);
            changeConversationScope("");
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
            try {
                for (const key of Object.keys(sessionStorage)) {
                    // Retire old account-only histories, whose child scope is unknown.
                    if (key.startsWith("atlas-ai:session:") && (!key.startsWith(STORAGE_PREFIX) || !nextUser || !key.startsWith(`${STORAGE_PREFIX}${encodeURIComponent(nextUser.id)}:`))) sessionStorage.removeItem(key);
                }
            } catch { /* Storage can be disabled in private browsing. */ }
            if (nextUser) void refreshChatStudents();
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
            studentListAbortRef.current?.abort(); studentListRequestRef.current += 1;
            topicListAbortRef.current?.abort(); topicListRequestRef.current += 1;
            stopListening();
            stopSpeaking();
            if (replyAnimationTimer.current) clearTimeout(replyAnimationTimer.current);
            try {
                if (userRef.current && readUser()?.id !== userRef.current.id) for (const key of Object.keys(sessionStorage)) if (key.startsWith(`${STORAGE_PREFIX}${encodeURIComponent(userRef.current.id)}:`)) sessionStorage.removeItem(key);
            } catch { /* Storage may be unavailable. */ }
        };
    }, [refreshStatus, refreshChatStudents, changeConversationScope, stopSpeaking, stopListening]);

    useEffect(() => {
        if (!user || readUser()?.id !== user.id || chatScopeRef.current.key !== conversationKey(user.id, selectedStudentId, selectedTopicId)) return;
        try {
            sessionStorage.setItem(chatScopeRef.current.key, JSON.stringify(messages.slice(-MAX_MESSAGES).map(({ role: messageRole, content, hasImage, generatedImage, hadGeneratedImage }) => ({ role: messageRole, content, hasImage, hadGeneratedImage: Boolean(generatedImage || hadGeneratedImage) }))));
        } catch { /* Keep the conversation in memory if storage is full. */ }
    }, [messages, user, selectedStudentId, selectedTopicId]);

    useEffect(() => { void refreshChatTopics(); }, [user?.id, selectedStudentId, refreshChatTopics]);

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
        if (selectedStudentId !== chatScopeRef.current.studentId || selectedTopicId !== chatScopeRef.current.topicId) return;
        if (role === "PARENT" && (!selectedStudentId || chatStudentsLoading || chatStudentsError)) { setError(chatStudentsError || "Eğitim sohbeti için önce öğrencini seç."); return; }
        if (text.length > 4000) { setError("Sorunu 4.000 karakterden kısa tutabilir misin?"); return; }
        if (mode === "image" && !status?.imageGeneration) { setError("Görsel oluşturma şu anda kullanılamıyor. Bağlantıyı yenileyebilir veya sorun üzerinde sohbetle ilerleyebilirsin."); return; }
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
        const requestScopeKey = chatScopeRef.current.key;
        const currentImage = attachment;
        const history = messages.slice(-12);
        const lastImageIndex = !currentImage ? history.findLastIndex((message) => message.role === "user" && message.image) : -1;
        const imagePrompt = mode === "image" ? "Bu fotoğraftaki soruyu ve verilenleri doğru yansıtan, çözümü adım adım açıklayan Türkçe bir eğitim görseli oluştur." : "Bu görseldeki soruyu adım adım açıklar mısın?";
        const userMessage: AtlasMessage = { id: `${Date.now()}-user`, role: "user", content: text || imagePrompt, ...(currentImage ? { image: currentImage, hasImage: true } : {}) };
        setPending(userMessage);
        try {
            const response = await apiPost("/atlas-ai/chat", {
                message: userMessage.content,
                mode,
                ...(selectedStudentId ? { studentId: selectedStudentId } : {}),
                ...(selectedTopicId ? { topicId: selectedTopicId } : {}),
                history: history.map(({ role: messageRole, content, image }, index) => ({ role: messageRole, content: content.slice(0, 4000), ...(index === lastImageIndex && image ? { image } : {}) })),
                ...(currentImage ? { image: currentImage } : {}),
            }, { timeout: mode === "image" ? 420000 : 300000, retries: 0, signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const fallback = response.status === 429 ? "Biraz yoğunluk var. Sorun burada duruyor; kısa bir süre sonra tekrar gönderebilirsin." : "Yanıtı getiremedim. Sorun burada duruyor; tekrar deneyebilirsin.";
                const message = typeof data.message === "string" ? data.message : fallback;
                throw new Error(!["ADMIN", "SUPERADMIN"].includes(role) && /OpenAI|API.?key|anahtar|sağlayıcı/i.test(message) ? fallback : message);
            }
            if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Yanıt boş geldi. Sorunu tekrar gönderebilirsin.");
            if (controller.signal.aborted || requestRef.current !== requestId || readUser()?.id !== currentUserId || chatScopeRef.current.key !== requestScopeKey) return;
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
            if (controller.signal.aborted || requestRef.current !== requestId || readUser()?.id !== currentUserId || chatScopeRef.current.key !== requestScopeKey) return;
            setError(cause instanceof Error && cause.name !== "AbortError" && cause.name !== "TypeError" ? cause.message : "Bağlantı zaman aşımına uğradı. Sorunu sakladım; tekrar deneyebilirsin.");
        } finally {
            if (requestRef.current === requestId) { chatAbortRef.current = null; busyRef.current = false; setLoading(false); setPending(null); }
        }
    };

    const prepareQuestionImage = (messageId: string) => {
        if (busyRef.current || !userRef.current || readUser()?.id !== userRef.current.id || user?.id !== userRef.current.id || chatScopeRef.current.accountId !== user.id) return;
        const question = messages.slice(-12).find(message => message.id === messageId && message.role === "user" && message.image);
        if (!question?.image) { setError("Bu sorunun fotoğrafını yeniden ekleyerek görsel hazırlayabilirsin."); return; }
        requestRef.current += 1;
        stopListening();
        stopSpeaking();
        setAttachment(question.image);
        setMode("image");
        setDraft("Bu fotoğraftaki sorunun çözümünü adım adım açıklayan, verilenleri ve doğru sonucu koruyan Türkçe bir eğitim görseli oluştur.");
        setError(null);
    };

    const cancel = () => {
        requestRef.current += 1;
        chatAbortRef.current?.abort();
        chatAbortRef.current = null;
        busyRef.current = false;
        setLoading(false);
        setPending(null);
        setError("Yanıtı beklemeyi durdurdun. Sorun burada duruyor; düzenleyip yeniden gönderebilirsin.");
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
        try { if (user && chatScopeRef.current.key) sessionStorage.removeItem(chatScopeRef.current.key); } catch { }
    };

    const toggleListening = () => {
        if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
        if (role === "PARENT" && (!selectedStudentId || chatStudentsLoading || chatStudentsError)) { setError(chatStudentsError || "Sesli soru için önce öğrencini seç."); return; }
        const browser = window as VoiceWindow;
        const RecognitionConstructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
        if (!RecognitionConstructor || busyRef.current) return;
        stopSpeaking();
        const recognition = new RecognitionConstructor();
        const recognitionUserId = userRef.current?.id;
        const recognitionScopeKey = chatScopeRef.current.key;
        recognition.lang = "tr-TR";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            if (recognitionRef.current !== recognition || readUser()?.id !== recognitionUserId || chatScopeRef.current.key !== recognitionScopeKey) return;
            const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
            setDraft((previous) => `${previous}${previous ? " " : ""}${transcript}`.slice(0, 4000));
        };
        recognition.onerror = (event) => {
            if (recognitionRef.current !== recognition || readUser()?.id !== recognitionUserId || chatScopeRef.current.key !== recognitionScopeKey) return;
            if (event.error !== "aborted") setError(event.error === "not-allowed" ? "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir veya sorunu yazabilirsin." : "Sesini duyamadım. Yeniden deneyebilir veya sorunu yazabilirsin.");
            setListening(false);
        };
        recognition.onend = () => {
            if (recognitionRef.current === recognition) { recognitionRef.current = null; setListening(false); }
        };
        recognitionRef.current = recognition;
        try { recognition.start(); setListening(true); setError(null); } catch { setError("Mikrofon açılamadı. Sorunu yazarak devam edebilirsin."); }
    };

    return <AtlasContext.Provider value={{ role, name: user?.firstName || "", accountId: user?.id || null, chatStudents, chatStudentsLoading, chatStudentsError, selectedStudentId, selectChatStudent, refreshChatStudents, chatTopics, chatTopicsLoading, chatTopicsError, selectedTopicId, selectChatTopic, refreshChatTopics, studentSelectionRequired: role === "PARENT" && (!selectedStudentId || chatStudentsLoading || !!chatStudentsError), conversationScopeKey: user ? conversationKey(user.id, selectedStudentId, selectedTopicId) : "", mode, setMode: (next) => { setMode(next); setError(null); }, prepareQuestionImage, messages, draft, setDraft, attachment, setAttachment, loading, pending, error, setError, status, refreshStatus, send, clear, cancel, getConversationRevision: () => requestRef.current, open, setOpen: (next) => { visibleRef.current = next || pathname.endsWith("/atlas-ai"); setOpen(next); }, voiceEnabled, toggleVoice: () => { voiceRef.current = !voiceRef.current; setVoiceEnabled(voiceRef.current); if (!voiceRef.current) stopSpeaking(); }, speechSupported, recognitionSupported, listening, toggleListening, stopListening, speaking, replyAnimating, speak, stopSpeaking }}>
        {children}
        <AtlasAILauncher />
    </AtlasContext.Provider>;
}

export function useAtlasAI() {
    const context = useContext(AtlasContext);
    if (!context) throw new Error("AtlasAI must be used within AtlasAIProvider");
    return context;
}
