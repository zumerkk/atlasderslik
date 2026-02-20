"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Pencil, Loader2, CheckCircle, AlertCircle, Package } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Pkg {
    _id: string; name: string; description: string; subtitle: string;
    price: number; isActive: boolean; features: string[];
    badge: string; sortOrder: number; period: string; createdAt: string;
}

const emptyForm = { name: "", description: "", subtitle: "", price: 0, features: "", badge: "", sortOrder: 0, period: "monthly" };

export default function PackagesPage() {
    const [packages, setPackages] = useState<Pkg[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { fetchPackages(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchPackages = async () => {
        try { const res = await apiGet("/packages"); if (res.ok) setPackages(await res.json()); }
        catch { } finally { setLoading(false); }
    };

    const openCreate = () => { setEditingPkg(null); setForm(emptyForm); setDialogOpen(true); };
    const openEdit = (pkg: Pkg) => {
        setEditingPkg(pkg);
        setForm({
            name: pkg.name, description: pkg.description, subtitle: pkg.subtitle || "",
            price: pkg.price, features: (pkg.features || []).join(", "),
            badge: pkg.badge || "", sortOrder: pkg.sortOrder || 0, period: pkg.period || "monthly",
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setFeedback(null);
        const payload = {
            name: form.name, description: form.description, subtitle: form.subtitle,
            price: form.price, features: form.features.split(",").map(f => f.trim()).filter(Boolean),
            badge: form.badge, sortOrder: form.sortOrder, period: form.period,
        };
        try {
            const res = editingPkg
                ? await apiPatch(`/packages/${editingPkg._id}`, payload)
                : await apiPost("/packages", payload);
            if (res.ok) {
                setDialogOpen(false); setEditingPkg(null);
                setFeedback({ type: "success", message: editingPkg ? "Paket güncellendi!" : "Paket oluşturuldu!" });
                fetchPackages();
            } else {
                const d = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: d.message || "İşlem başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;
        try {
            const res = await apiDelete(`/packages/${id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Paket silindi." }); fetchPackages(); }
            else { setFeedback({ type: "error", message: "Silinemedi." }); }
        } catch { }
    };

    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Paketler" description="Eğitim paketlerini ve fiyatlarını yönetin.">
                <Button onClick={openCreate}><Plus className="h-4 w-4" /> Yeni Paket</Button>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : packages.length === 0 ? (
                <EmptyState icon={Package} title="Henüz paket yok" description="Yeni bir paket ekleyerek başlayın." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sıra</TableHead>
                            <TableHead>Paket Adı</TableHead>
                            <TableHead>Alt Başlık</TableHead>
                            <TableHead>Fiyat</TableHead>
                            <TableHead>Badge</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {packages.map((pkg) => (
                            <TableRow key={pkg._id}>
                                <TableCell className="text-muted-foreground">{pkg.sortOrder}</TableCell>
                                <TableCell className="font-semibold">{pkg.name}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs truncate text-sm">{pkg.subtitle}</TableCell>
                                <TableCell className="font-semibold">{pkg.price.toLocaleString("tr-TR")} ₺</TableCell>
                                <TableCell>{pkg.badge ? <Badge variant="info">{pkg.badge}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                                <TableCell><Badge variant={pkg.isActive ? "success" : "destructive"}>{pkg.isActive ? "Aktif" : "Pasif"}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(pkg._id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPkg ? "Paket Düzenle" : "Yeni Paket Ekle"}</DialogTitle>
                        <DialogDescription>Paket detaylarını girin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                        <div className="grid gap-2"><Label>Paket Adı</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="grid gap-2"><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
                        <div className="grid gap-2"><Label>Alt Başlık</Label><Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Haftada 6 Ders | Maks 10 Kişi" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Fiyat (TL)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} required /></div>
                            <div className="grid gap-2"><Label>Sıra</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Badge</Label><Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder='Örn: "En Popüler", "VIP"' /></div>
                            <div className="grid gap-2">
                                <Label>Dönem</Label>
                                <select className={selectClass} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                                    <option value="monthly">Aylık</option><option value="yearly">Yıllık</option><option value="one-time">Tek Sefer</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-2"><Label>Özellikler (virgülle ayırın)</Label><Textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="Canlı dersler, Ödev takibi, Soru çözüm..." rows={3} /></div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{editingPkg ? "Güncelle" : "Kaydet"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
