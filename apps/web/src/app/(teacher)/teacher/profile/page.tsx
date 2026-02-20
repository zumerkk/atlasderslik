"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { User, Mail, Shield, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

export default function TeacherProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [formData, setFormData] = useState({ firstName: "", lastName: "", phone: "" });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiGet("/auth/profile");
                if (res.ok) { const data = await res.json(); setUser(data); setFormData({ firstName: data.firstName || "", lastName: data.lastName || "", phone: data.phone || "" }); }
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchProfile();
    }, []);

    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiPatch("/auth/profile", formData);
            if (res.ok) setFeedback({ type: "success", message: "Profil başarıyla güncellendi!" });
            else setFeedback({ type: "error", message: "Güncelleme başarısız." });
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSaving(false); }
    };

    const roleLabel = (role: string) => {
        const map: Record<string, string> = { ADMIN: "Yönetici", TEACHER: "Öğretmen", STUDENT: "Öğrenci", PARENT: "Veli" };
        return map[role] || role;
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <PageHeader title="Profilim" description="Hesap bilgilerinizi görüntüleyin ve güncelleyin." />

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    <div className="skeleton h-12 rounded-xl" />
                    <div className="skeleton h-12 rounded-xl" />
                    <div className="skeleton h-12 rounded-xl" />
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Kişisel Bilgiler</CardTitle>
                                <CardDescription>Hesap detaylarınızı düzenleyin.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Ad</Label><Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>Soyad</Label><Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-posta</Label>
                            <Input value={user?.email || ""} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez.</p>
                        </div>
                        <div className="grid gap-2"><Label>Telefon</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="05XX XXX XX XX" /></div>
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Rol</Label>
                            <div><Badge variant="info">{roleLabel(user?.role)}</Badge></div>
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
