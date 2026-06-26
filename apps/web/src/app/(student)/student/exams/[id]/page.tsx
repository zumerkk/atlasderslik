"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Clock, ChevronLeft, ChevronRight, HelpCircle, Send, LogOut } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface Question {
    _id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    difficulty: string;
    imageUrl?: string;
    type?: string;
    optionImages?: string[];
}

interface Test {
    _id: string;
    title: string;
    description: string;
    duration: number;
    questionIds: Question[];
}

export default function StudentTakeExamPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // seconds
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const initialDuration = useRef<number>(0);

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const res = await apiGet(`/education/tests/${testId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTest(data);
                    
                    // Setup Timer
                    if (data.duration && data.duration > 0) {
                        setTimeLeft(data.duration * 60);
                        initialDuration.current = data.duration * 60;
                    } else {
                        setTimeLeft(-1); // infinite
                    }
                }
            } catch (e) {
                console.error("Test fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId]);

    // Timer Effect
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) {
            if (timeLeft === 0) {
                handleSubmit(true); // Auto-submit when time expires
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleSelectOption = (qId: string, optIdx: number) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: prev[qId] === optIdx ? -1 : optIdx // Toggle option selection
        }));
    };

    const handleSubmit = async (isAuto = false) => {
        if (submitting) return;
        setSubmitting(true);
        setConfirmOpen(false);

        // Calculate time spent
        let timeSpent = 0;
        if (initialDuration.current > 0 && timeLeft !== null) {
            timeSpent = initialDuration.current - timeLeft;
        }

        try {
            const formattedAnswers: Record<string, number> = {};
            test?.questionIds.forEach(q => {
                formattedAnswers[q._id] = answers[q._id] !== undefined ? answers[q._id] : -1;
            });

            const res = await apiPost(`/education/tests/${testId}/submit`, {
                answers: formattedAnswers,
                durationSeconds: timeSpent
            });

            if (res.ok) {
                router.push(`/student/exams/${testId}/result`);
            } else {
                alert("Sınav gönderilirken bir hata oluştu.");
                setSubmitting(false);
            }
        } catch (e) {
            console.error("Submit test error", e);
            alert("Bir hata oluştu.");
            setSubmitting(false);
        }
    };

    const formatTimer = () => {
        if (timeLeft === null) return "--:--";
        if (timeLeft === -1) return "Süresiz";
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground text-sm">Sınav ekranı hazırlanıyor...</p>
            </div>
        );
    }

    if (!test || !test.questionIds.length) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <AlertCircle className="h-16 w-16 text-rose-500" />
                <h2 className="text-2xl font-bold">Hata</h2>
                <p className="text-muted-foreground max-w-md">Sınav bulunamadı veya sınavda soru bulunmuyor.</p>
                <Button onClick={() => router.push("/student/exams")}>Sınavlar Sayfasına Dön</Button>
            </div>
        );
    }

    const currentQuestion = test.questionIds[currentIdx];
    const isAnswered = (qId: string) => answers[qId] !== undefined && answers[qId] !== -1;

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col select-none overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="font-bold text-sm md:text-base line-clamp-1">{test.title}</h1>
                        <p className="text-xs text-muted-foreground">Toplam {test.questionIds.length} Soru</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {timeLeft !== null && timeLeft !== -1 && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                            timeLeft < 60 ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse" : "bg-muted/50"
                        }`}>
                            <Clock className="h-4 w-4" />
                            <span>{formatTimer()}</span>
                        </div>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => router.push("/student/exams")} className="text-muted-foreground hover:text-foreground">
                        <LogOut className="h-4 w-4 mr-1.5" /> Ayrıl
                    </Button>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Side: Question and Options */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
                    <div className="space-y-6 max-w-3xl mx-auto w-full">
                        {/* Question Label */}
                        <div className="flex items-center justify-between">
                            <Badge variant="outline">Soru {currentIdx + 1} / {test.questionIds.length}</Badge>
                            <Badge variant="secondary" className="capitalize text-[10px]">
                                Zorluk: {currentQuestion.difficulty === "EASY" ? "Kolay" : currentQuestion.difficulty === "HARD" ? "Zor" : "Orta"}
                            </Badge>
                        </div>

                        {/* Question Body */}
                        <Card className="border-none shadow-none bg-transparent">
                            <CardContent className="p-0 space-y-4">
                                {currentQuestion.imageUrl && (
                                    <div className="bg-muted/30 p-2 rounded-2xl border max-h-[300px] flex justify-center overflow-hidden">
                                        <img src={currentQuestion.imageUrl} alt="Soru Görseli" className="object-contain max-h-[280px]" />
                                    </div>
                                )}
                                {currentQuestion.text && (
                                    <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line text-foreground">
                                        {currentQuestion.text}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Options Grid */}
                        <div className="grid gap-3 pt-4">
                            {currentQuestion.options.map((optionText, oIdx) => {
                                const optionLetter = String.fromCharCode(65 + oIdx);
                                const isSelected = answers[currentQuestion._id] === oIdx;
                                const isImageOption = currentQuestion.optionImages && currentQuestion.optionImages[oIdx];

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => handleSelectOption(currentQuestion._id, oIdx)}
                                        className={`flex items-start text-left p-4 rounded-xl border-2 transition-all hover:bg-muted/20 ${
                                            isSelected
                                                ? "border-primary bg-primary/5 text-primary-foreground shadow-sm"
                                                : "border-border bg-card text-foreground"
                                        }`}
                                    >
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mr-3 border ${
                                            isSelected ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground"
                                        }`}>
                                            {optionLetter}
                                        </span>
                                        <div className="flex-1 pt-0.5 text-sm md:text-base font-normal">
                                            {isImageOption ? (
                                                <img src={currentQuestion.optionImages![oIdx]} alt={`Seçenek ${optionLetter}`} className="max-h-24 object-contain rounded" />
                                            ) : (
                                                optionText
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Question Controls */}
                    <div className="border-t pt-6 mt-8 flex items-center justify-between shrink-0 max-w-3xl mx-auto w-full">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1.5" /> Önceki Soru
                        </Button>

                        {currentIdx === test.questionIds.length - 1 ? (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setConfirmOpen(true)}
                            >
                                Sınavı Bitir <Send className="h-4 w-4 ml-1.5" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setCurrentIdx(prev => Math.min(test.questionIds.length - 1, prev + 1))}
                            >
                                Sonraki Soru <ChevronRight className="h-4 w-4 ml-1.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Right Side: Navigation Bar */}
                <div className="w-64 border-l bg-card flex flex-col justify-between p-4 shrink-0 hidden md:flex">
                    <div className="space-y-4">
                        <h2 className="font-semibold text-sm px-1">Soru Navigasyonu</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {test.questionIds.map((q, idx) => {
                                const active = idx === currentIdx;
                                const answered = isAnswered(q._id);

                                return (
                                    <button
                                        key={q._id}
                                        onClick={() => setCurrentIdx(idx)}
                                        className={`h-10 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${
                                            active
                                                ? "bg-primary text-white border-primary shadow-sm"
                                                : answered
                                                ? "bg-primary/10 text-primary border-primary/30"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setConfirmOpen(true)}
                        >
                            Sınavı Bitir <Send className="h-4 w-4 ml-1.5" />
                        </Button>
                    </div>
                </div>
            </main>

            {/* Confirm Dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sınavı Bitir</DialogTitle>
                        <DialogDescription>
                            Sınavı tamamlamak istediğinize emin misiniz? Gönderdikten sonra cevaplarınızı değiştiremezsiniz.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Stats summary */}
                    <div className="py-3 text-xs space-y-2 border rounded-xl p-3 bg-muted/30">
                        <div className="flex justify-between">
                            <span>Toplam Soru:</span>
                            <span className="font-bold">{test.questionIds.length}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                            <span>İşaretlenen Soru:</span>
                            <span className="font-bold">
                                {test.questionIds.filter(q => isAnswered(q._id)).length}
                            </span>
                        </div>
                        <div className="flex justify-between text-rose-500">
                            <span>Boş Bırakılan:</span>
                            <span className="font-bold">
                                {test.questionIds.filter(q => !isAnswered(q._id)).length}
                            </span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                            Geri Dön
                        </Button>
                        <Button onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
                            {submitting ? "Gönderiliyor..." : "Sınavı Bitir ve Gönder"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
