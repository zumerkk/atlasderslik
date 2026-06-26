"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Clock, BarChart2, Award } from "lucide-react";
import { apiGet } from "@/lib/api";

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

interface TestResult {
    _id: string;
    score: number;
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    durationSeconds: number;
    answers: Record<string, number>;
}

interface Test {
    _id: string;
    title: string;
    description: string;
    questionIds: Question[];
}

export default function StudentExamResultPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [data, setData] = useState<{ result: TestResult; test: Test } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await apiGet(`/education/tests/${testId}/result`);
                if (res.ok) {
                    const json = await res.json();
                    
                    // Transform Mongoose Map to plain Record
                    if (json.result && json.result.answers) {
                        const plainAnswers: Record<string, number> = {};
                        Object.keys(json.result.answers).forEach(key => {
                            plainAnswers[key] = json.result.answers[key];
                        });
                        json.result.answers = plainAnswers;
                    }
                    setData(json);
                }
            } catch (e) {
                console.error("Result fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [testId]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return "0 dk";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins} dk ${secs} sn` : `${secs} sn`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground text-sm">Analiz yükleniyor...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 space-y-4 max-w-md mx-auto">
                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
                <h2 className="text-xl font-bold">Sonuç Bulunamadı</h2>
                <p className="text-muted-foreground">Bu deneme sınavına ait sonuç analizi bulunamadı.</p>
                <Button onClick={() => router.push("/student/exams")} className="w-full">
                    Sınavlar Sayfasına Dön
                </Button>
            </div>
        );
    }

    const { result, test } = data;
    const questions = test.questionIds || [];

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header / Back Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" onClick={() => router.push("/student/exams")} className="p-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Sınavlara Dön
                    </Button>
                    <h1 className="text-2xl font-bold mt-2">{test.title} - Sınav Analizi</h1>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                </div>
            </div>

            {/* Performance Dashboard */}
            <div className="grid gap-6 md:grid-cols-4">
                {/* Visual Score Circle Ring Card */}
                <Card className="flex flex-col items-center justify-center p-6 text-center md:col-span-1">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 justify-center">
                            <Award className="h-4 w-4 text-primary" /> Başarı Skoru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col items-center">
                        <div className="relative flex items-center justify-center w-28 h-28 my-3">
                            {/* SVG circular ring */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" stroke="currentColor" className="text-muted/20" strokeWidth="8" fill="transparent" />
                                <circle
                                    cx="56" cy="56" r="48" stroke="currentColor"
                                    className={`${result.score >= 70 ? "text-emerald-500" : result.score >= 40 ? "text-amber-500" : "text-rose-500"}`}
                                    strokeWidth="8" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 48}
                                    strokeDashoffset={2 * Math.PI * 48 * (1 - result.score / 100)}
                                />
                            </svg>
                            <span className="absolute text-2xl font-extrabold">%{result.score}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Score Details Cards */}
                <div className="grid grid-cols-2 gap-4 md:col-span-3">
                    <Card className="p-4 flex flex-col justify-between hover:shadow-sm border-l-4 border-l-emerald-500">
                        <span className="text-xs text-muted-foreground">Doğru Cevaplar</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-emerald-600">{result.correctCount}</span>
                            <span className="text-xs text-muted-foreground">/ {questions.length} soru</span>
                        </div>
                    </Card>

                    <Card className="p-4 flex flex-col justify-between hover:shadow-sm border-l-4 border-l-rose-500">
                        <span className="text-xs text-muted-foreground">Yanlış Cevaplar</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-rose-500">{result.wrongCount}</span>
                            <span className="text-xs text-muted-foreground">/ {questions.length} soru</span>
                        </div>
                    </Card>

                    <Card className="p-4 flex flex-col justify-between hover:shadow-sm border-l-4 border-l-gray-400">
                        <span className="text-xs text-muted-foreground">Boş / Atlanan</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-gray-500">{result.emptyCount}</span>
                            <span className="text-xs text-muted-foreground">/ {questions.length} soru</span>
                        </div>
                    </Card>

                    <Card className="p-4 flex flex-col justify-between hover:shadow-sm border-l-4 border-l-primary">
                        <span className="text-xs text-muted-foreground">Toplam Süre</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-primary flex items-center gap-1">
                                <Clock className="h-5 w-5 shrink-0" />
                                {formatDuration(result.durationSeconds)}
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Question Breakdown List */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" /> Soru Detaylı Analiz
                </h2>

                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        const studentAnsIdx = result.answers[q._id];
                        const correctAnsIdx = q.correctAnswer;
                        const isEmpty = studentAnsIdx === undefined || studentAnsIdx === -1;
                        const isCorrect = !isEmpty && studentAnsIdx === correctAnsIdx;

                        return (
                            <Card
                                key={q._id}
                                className={`overflow-hidden border-2 ${
                                    isCorrect
                                        ? "border-emerald-100 bg-emerald-50/10"
                                        : isEmpty
                                        ? "border-gray-200 bg-gray-50/10"
                                        : "border-rose-100 bg-rose-50/10"
                                }`}
                            >
                                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="mr-2">Soru {idx + 1}</Badge>
                                        <Badge variant="secondary" className="capitalize text-[10px]">Zorluk: {q.difficulty}</Badge>
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                        {isCorrect ? (
                                            <div className="flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                <CheckCircle className="h-4 w-4" /> Doğru
                                            </div>
                                        ) : isEmpty ? (
                                            <div className="flex items-center gap-1 text-gray-500 font-semibold text-xs bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                                                <AlertCircle className="h-4 w-4" /> Boş Bırakıldı
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-rose-600 font-semibold text-xs bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                                <XCircle className="h-4 w-4" /> Yanlış
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Question Image */}
                                    {q.imageUrl && (
                                        <div className="bg-muted/10 p-2 rounded-xl border max-w-lg overflow-hidden flex justify-center">
                                            <img src={q.imageUrl} alt="Soru Görseli" className="max-h-[250px] object-contain rounded" />
                                        </div>
                                    )}

                                    {/* Question Text */}
                                    {q.text && <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{q.text}</p>}

                                    {/* Options list */}
                                    <div className="grid gap-2 pt-2">
                                        {q.options.map((optionText, oIdx) => {
                                            const optionLetter = String.fromCharCode(65 + oIdx);
                                            const wasSelectedByStudent = studentAnsIdx === oIdx;
                                            const isCorrectOption = correctAnsIdx === oIdx;
                                            const isImageOption = q.optionImages && q.optionImages[oIdx];

                                            let optionClass = "border-border bg-card";
                                            let icon = null;

                                            if (isCorrectOption) {
                                                optionClass = "border-emerald-500 bg-emerald-50/20 text-emerald-900 font-medium";
                                                icon = <CheckCircle className="h-4 w-4 text-emerald-600 ml-auto shrink-0" />;
                                            } else if (wasSelectedByStudent && !isCorrectOption) {
                                                optionClass = "border-rose-500 bg-rose-50/20 text-rose-900 font-medium";
                                                icon = <XCircle className="h-4 w-4 text-rose-600 ml-auto shrink-0" />;
                                            }

                                            return (
                                                <div
                                                    key={oIdx}
                                                    className={`flex items-start p-3 rounded-lg border text-sm transition-colors ${optionClass}`}
                                                >
                                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs mr-3 border shrink-0 ${
                                                        isCorrectOption
                                                            ? "bg-emerald-600 text-white border-emerald-600"
                                                            : wasSelectedByStudent
                                                            ? "bg-rose-600 text-white border-rose-600"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}>
                                                        {optionLetter}
                                                    </span>
                                                    <div className="flex-1 pt-0.5">
                                                        {isImageOption ? (
                                                            <img src={q.optionImages![oIdx]} alt={`Seçenek ${optionLetter}`} className="max-h-16 object-contain rounded" />
                                                        ) : (
                                                            optionText
                                                        )}
                                                    </div>
                                                    {icon}
                                                    {wasSelectedByStudent && (
                                                        <Badge variant="outline" className="ml-2 text-[10px] bg-background shrink-0">
                                                            Senin Seçimin
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
