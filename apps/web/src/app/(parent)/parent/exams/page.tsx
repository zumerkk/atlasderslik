"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentSwitcher } from "@/components/parent/student-switcher";
import { useParentData, formatDate, net } from "@/lib/parent-data";
import { GraduationCap, Users } from "lucide-react";

export default function ParentExamsPage() {
    const { students, active, activeId, setActiveId, loading, error } = useParentData();
    const exams = (active?.assignments ?? []).filter((a) => a.opticResult);
    const s = active?.summary;

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Sınav Sonuçları"
                description="Optik formla değerlendirilen sınavların doğru, yanlış, boş ve net dökümü."
            />

            {error && (
                <div className="px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
            )}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                </div>
            ) : !active ? (
                <EmptyState
                    icon={Users}
                    title="Henüz bağlı öğrenci yok"
                    description="Yöneticinizle iletişime geçerek çocuğunuzun kaydını veli hesabınıza bağlatabilirsiniz."
                />
            ) : (
                <>
                    <StudentSwitcher students={students} activeId={activeId} onSelect={setActiveId} />

                    {exams.length === 0 ? (
                        <EmptyState
                            icon={GraduationCap}
                            title="Henüz optik sınav sonucu yok"
                            description="Çocuğunuz optik formlu bir sınavı tamamladığında sonuçlar burada listelenecek."
                        />
                    ) : (
                        <>
                            {s && (
                                <Card className="border-2 border-indigo-100 dark:border-indigo-900/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Genel Durum</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {s.examCount} sınav üzerinden toplam
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <Stat label="Toplam Doğru" value={s.opticTotals.correct} tone="text-emerald-600" />
                                            <Stat label="Toplam Yanlış" value={s.opticTotals.incorrect} tone="text-rose-600" />
                                            <Stat label="Toplam Boş" value={s.opticTotals.empty} tone="text-slate-500" />
                                            <Stat label="Net Ortalama" value={s.netAverage ?? "—"} tone="text-indigo-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="space-y-3">
                                {exams.map((a) => {
                                    const o = a.opticResult!;
                                    const total = o.correct + o.incorrect + o.empty;
                                    const pct = total ? Math.round((o.correct / total) * 100) : 0;
                                    return (
                                        <Card key={a._id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {a.subject || "Ders belirtilmemiş"} · {formatDate(a.submittedAt)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-xl font-bold text-indigo-600">{net(o.correct, o.incorrect)}</div>
                                                        <div className="text-[11px] text-muted-foreground">net</div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 space-y-3">
                                                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                                    <div className="bg-emerald-500" style={{ width: `${total ? (o.correct / total) * 100 : 0}%` }} />
                                                    <div className="bg-rose-500" style={{ width: `${total ? (o.incorrect / total) * 100 : 0}%` }} />
                                                    <div className="bg-slate-300" style={{ width: `${total ? (o.empty / total) * 100 : 0}%` }} />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                                                    <span className="text-emerald-600 font-medium">{o.correct} doğru</span>
                                                    <span className="text-rose-600 font-medium">{o.incorrect} yanlış</span>
                                                    <span className="text-slate-500 font-medium">{o.empty} boş</span>
                                                    <span className="text-muted-foreground">Başarı: %{pct}</span>
                                                    {typeof a.grade === "number" && (
                                                        <span className="text-muted-foreground">
                                                            Puan: <span className="font-semibold text-foreground">{a.grade}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
    return (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className={`text-xl font-bold ${tone}`}>{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        </div>
    );
}
