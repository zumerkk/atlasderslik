"use client";

import { useEffect, useRef, useState } from "react";
import { Package, Plus, Pencil, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { commerceJson, money, packagePayload, PERIOD_LABELS, type CommercePackage, type PackageDraft, type PackageGrade, type PackagePeriod, type PackageGradePolicy } from "@/lib/commerce";
import { currentCommerceAccount, useCommerceAccount } from "@/components/commerce/use-commerce-account";

const emptyForm: PackageDraft = { name: "", description: "", subtitle: "", price: "", originalPrice: "0", features: "", badge: "", sortOrder: "0", period: "monthly", isActive: false, gradeIds: [], gradePolicy: "fixed" };
const packageDraft = (pkg: CommercePackage): PackageDraft => ({ name: pkg.name, description: pkg.description, subtitle: pkg.subtitle || "", price: String(pkg.price), originalPrice: String(pkg.originalPrice || 0), features: (pkg.features || []).join("\n"), badge: pkg.badge || "", sortOrder: String(pkg.sortOrder || 0), period: pkg.period, isActive: pkg.isActive, gradeIds: pkg.gradeIds || [], gradePolicy: pkg.gradePolicy || "fixed" });

export default function PackagesPage() {
    const { account } = useCommerceAccount();
    const [packages, setPackages] = useState<CommercePackage[]>([]);
    const [grades, setGrades] = useState<PackageGrade[]>([]);
    const [publishedIds, setPublishedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState("");
    const [formError, setFormError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<CommercePackage | null>(null);
    const [busy, setBusy] = useState("");
    const busyRef = useRef(false);
    const [revision, setRevision] = useState(0);
    const [form, setForm] = useState<PackageDraft>(emptyForm);
    const [query, setQuery] = useState("");
    const [activity, setActivity] = useState("");
    useEffect(() => { setPackages([]); setGrades([]); setPublishedIds([]); setDialogOpen(false); setEditingPkg(null); setFeedback(""); setFormError(""); setBusy(""); busyRef.current = false; }, [account]);
    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setError("");
        if (!account) return () => controller.abort();
        void (async () => { try {
            const [rows, gradeRows, published] = await Promise.all([apiGet("/packages/admin", { signal: controller.signal, retries: 0 }).then(response => commerceJson<CommercePackage[]>(response, "Paketler yüklenemedi.")), apiGet("/education/grades", { signal: controller.signal, retries: 0 }).then(response => commerceJson<PackageGrade[]>(response, "Sınıflar yüklenemedi.")), apiGet("/packages/active", { signal: controller.signal, retries: 0, skipAuth: true }).then(response => commerceJson<CommercePackage[]>(response, "Yayınlanan paket kataloğu doğrulanamadı."))]);
            if (!Array.isArray(rows) || !Array.isArray(gradeRows) || !Array.isArray(published)) throw new Error("Paket veya sınıf listesi doğrulanamadı.");
            if (!controller.signal.aborted && currentCommerceAccount(account)) { setPackages(rows); setGrades(gradeRows); setPublishedIds(published.map(pkg => pkg._id)); }
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setError(cause instanceof Error ? cause.message : "Paketler yüklenemedi."); } finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); } })();
        return () => controller.abort();
    }, [account, revision]);
    const openForm = (pkg?: CommercePackage) => {
        setEditingPkg(pkg || null); setFormError("");
        setForm(pkg ? packageDraft(pkg) : { ...emptyForm, gradeIds: [] });
        setDialogOpen(true);
    };
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault(); if (busyRef.current || !currentCommerceAccount(account)) return;
        setFormError("");
        let payload; try { payload = packagePayload(form, grades); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Paket bilgilerini kontrol edin."); return; }
        busyRef.current = true; setBusy("save"); setFeedback("");
        try { await commerceJson(await (editingPkg ? apiPatch(`/packages/${editingPkg._id}`, payload, { retries: 0 }) : apiPost("/packages", payload, { retries: 0 })), "Paket kaydedilemedi."); if (currentCommerceAccount(account)) { setDialogOpen(false); setFeedback(editingPkg ? "Paket güncellendi. Önceki siparişlerin fiyat ve sınıf kayıtları korunur." : "Paket kaydedildi."); setRevision(value => value + 1); } }
        catch (cause) { if (currentCommerceAccount(account)) setFormError(cause instanceof Error ? cause.message : "Paket kaydedilemedi."); }
        finally { busyRef.current = false; if (currentCommerceAccount(account)) setBusy(""); }
    };
    const deactivate = async (pkg: CommercePackage) => {
        if (busyRef.current || !currentCommerceAccount(account)) return;
        busyRef.current = true; setBusy(pkg._id); setError("");
        try { await commerceJson(await apiDelete(`/packages/${pkg._id}`, { retries: 0 }), "Paket pasife alınamadı."); if (currentCommerceAccount(account)) { setFeedback("Paket satışa kapatıldı. Ödenmiş siparişler ve öğrenci erişimleri korunur."); setRevision(value => value + 1); } }
        catch (cause) { if (currentCommerceAccount(account)) setError(cause instanceof Error ? cause.message : "Paket pasife alınamadı."); }
        finally { busyRef.current = false; if (currentCommerceAccount(account)) setBusy(""); }
    };
    const saleStatus = (pkg: CommercePackage) => !pkg.isActive ? "inactive" : publishedIds.includes(pkg._id) ? "published" : "incomplete";
    const publicationIssue = (pkg: CommercePackage) => {
        try { packagePayload(packageDraft(pkg), grades); return "Paket sunucunun satış koşullarını karşılamıyor; katalogda yayınlanmaz."; }
        catch (cause) { return cause instanceof Error ? cause.message : "Paket kurulumu tamamlanmalı; katalogda yayınlanmaz."; }
    };
    const shown = packages.filter(pkg => `${pkg.name} ${pkg.description}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")) && (!activity || saleStatus(pkg) === activity));
    const selectedGrades = grades.filter(grade => form.gradeIds.includes(grade._id));
    const selectedLevels = new Set(selectedGrades.map(grade => grade.level));
    return <div className="space-y-6 animate-fade-in"><PageHeader title="Eğitim paketleri" description="Fiyat, dönem ve ödeme sonrası atanacak sınıfları birlikte yönetin."><Button variant="outline" disabled={loading || !!busy} onClick={() => setRevision(value => value + 1)}><RefreshCw className="h-4 w-4" />Yenile</Button><Button onClick={() => openForm()} disabled={loading || !!error}><Plus className="h-4 w-4" />Yeni paket</Button></PageHeader>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{feedback && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</p>}
        <div className="flex flex-wrap gap-3"><Input className="max-w-sm" aria-label="Paket ara" placeholder="Paket ara…" value={query} onChange={event => setQuery(event.target.value)} /><select className="rounded-xl border bg-background px-3" aria-label="Satış durumu" value={activity} onChange={event => setActivity(event.target.value)}><option value="">Tüm paketler</option><option value="published">Katalogda satışta</option><option value="incomplete">Kurulum eksik · satışta değil</option><option value="inactive">Taslak / pasif</option></select></div>
        {loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-label="Paketler yükleniyor" /> : error ? <p className="text-sm text-muted-foreground">Güncel paketler doğrulanamadı. Yenile düğmesiyle tekrar deneyin.</p> : !shown.length ? <EmptyState icon={Package} title="Paket bulunamadı" description="Yeni bir taslak oluşturabilir veya filtreleri değiştirebilirsiniz." /> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-sm text-left"><thead><tr className="border-b bg-muted/40">{["Sıra / Paket", "Fiyat", "Dönem", "Sınıflar", "Satış", "İşlemler"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{shown.map(pkg => <tr key={pkg._id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{pkg.sortOrder || 0} · {pkg.name}</p><p className="text-xs text-muted-foreground">{pkg.subtitle}</p></td><td className="p-3 whitespace-nowrap">{money(pkg.price)}{!!pkg.originalPrice && <span className="block text-xs text-muted-foreground line-through">{money(pkg.originalPrice)}</span>}</td><td className="p-3">{PERIOD_LABELS[pkg.period]}</td><td className="p-3 text-xs max-w-64"><p className="font-medium mb-1">{pkg.gradePolicy === "student-level" ? "Öğrencinin seviyesine göre" : "Sabit sınıf kapsamı"}</p>{pkg.gradeIds?.map(id => { const grade = grades.find(row => row._id === id); return grade ? `${grade.level}. sınıf ${grade.label}${grade.isActive ? "" : " (pasif)"}` : "Sınıf kaydı yok"; }).join(", ") || "Henüz sınıf seçilmedi"}</td><td className="p-3"><Badge variant={saleStatus(pkg) === "published" ? "success" : saleStatus(pkg) === "incomplete" ? "warning" : "secondary"}>{saleStatus(pkg) === "published" ? "Satışa açık" : saleStatus(pkg) === "incomplete" ? "Kurulum eksik · satışta değil" : "Taslak / pasif"}</Badge>{saleStatus(pkg) === "incomplete" && <p className="mt-2 max-w-64 text-xs text-amber-800">Katalogda yayınlanmaz. {publicationIssue(pkg)}</p>}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!!busy} onClick={() => openForm(pkg)}><Pencil className="h-3 w-3" />Düzenle</Button>{pkg.isActive && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void deactivate(pkg)}>{busy === pkg._id && <Loader2 className="h-3 w-3 animate-spin" />}Pasife al</Button>}</div></td></tr>)}</tbody></table></div>}
        <Dialog open={dialogOpen} onOpenChange={open => { if (!busy) setDialogOpen(open); }}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingPkg ? "Paketi düzenle" : "Yeni paket taslağı"}</DialogTitle><DialogDescription>Satışa açık paketler ilkokul ve ortaokul 1–8. sınıflarda, aktif şubelere bağlanmalıdır. Sabit kapsam tek seviyeyi; öğrenci seviyesine göre kapsam, yapılandırılmış her seviyeden bir şubeyi kullanır. Dönem tek çekim satın alma süresidir; otomatik yenileme yapılmaz.</DialogDescription></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><fieldset disabled={!!busy} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="package-name">Paket adı</Label><Input id="package-name" required minLength={2} maxLength={120} value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="package-description">Açıklama</Label><Textarea id="package-description" required minLength={10} maxLength={4000} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="package-subtitle">Alt başlık</Label><Input id="package-subtitle" maxLength={180} value={form.subtitle} onChange={event => setForm(previous => ({ ...previous, subtitle: event.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{([{ field: "price", label: "Satış fiyatı (TL)", min: "0.01", max: "9999999.99", step: ".01" }, { field: "originalPrice", label: "Karşılaştırma fiyatı (TL)", min: "0", max: "9999999.99", step: ".01" }, { field: "sortOrder", label: "Sıralama", min: "0", max: "10000", step: "1" }] as const).map(item => <div className="space-y-2" key={item.field}><Label htmlFor={`package-${item.field}`}>{item.label}</Label><Input id={`package-${item.field}`} type="number" required min={item.min} max={item.max} step={item.step} value={form[item.field]} onChange={event => setForm(previous => ({ ...previous, [item.field]: event.target.value }))} /></div>)}</div><p className="text-xs text-muted-foreground">Karşılaştırma fiyatını göstermemek için 0 girin. Gösterilen fiyat satış fiyatından yüksek olmalıdır.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="package-period">Paket dönemi</Label><select id="package-period" className="h-11 w-full rounded-xl border bg-background px-3" value={form.period} onChange={event => setForm(previous => ({ ...previous, period: event.target.value as PackagePeriod }))}>{Object.entries(PERIOD_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="package-badge">Etiket</Label><Input id="package-badge" maxLength={50} value={form.badge} onChange={event => setForm(previous => ({ ...previous, badge: event.target.value }))} /></div></div>
            <div className="space-y-2"><Label htmlFor="package-features">Özellikler — her satıra bir özellik</Label><Textarea id="package-features" value={form.features} rows={4} onChange={event => setForm(previous => ({ ...previous, features: event.target.value }))} /><p className="text-xs text-muted-foreground">En fazla 30 özellik; her satır 2–180 karakter.</p></div>
            <div className="space-y-2"><Label htmlFor="package-grade-policy">Sınıf kapsamı politikası</Label><select id="package-grade-policy" className="h-11 w-full rounded-xl border bg-background px-3" value={form.gradePolicy || "fixed"} onChange={event => setForm(previous => ({ ...previous, gradePolicy: event.target.value as PackageGradePolicy }))}><option value="fixed">Sabit sınıf kapsamı</option><option value="student-level">Öğrencinin seviyesine göre</option></select><p className="text-xs text-muted-foreground">{form.gradePolicy === "student-level" ? "Farklı seviyeler için birer aktif sınıf seçin. Satın alan öğrenciye yalnızca kendi seviyesindeki sınıf atanır; tüm seviyeler birlikte verilmez." : "Aynı seviyeden bir veya birden fazla şube seçin; seçili kapsam satın alma sonrası atanır."}</p></div><fieldset className="rounded-xl border p-3 space-y-2"><legend className="px-1 text-sm font-medium">Ödeme sonrası atanacak sınıflar</legend><p className="text-xs text-muted-foreground">İlkokul ve ortaokul 1–8. sınıflardan seçtiğiniz politikaya uygun şubeleri belirleyin. Satışa açmak için en az bir aktif sınıf gerekir; sınıfsız paket taslak olarak saklanabilir.</p>{grades.filter(grade => grade.level >= 1 && grade.level <= 8).map(grade => { const checked = form.gradeIds.includes(grade._id); return <label key={grade._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} disabled={!checked && (!grade.isActive || ((form.gradePolicy || "fixed") === "fixed" ? selectedLevels.size > 0 && !selectedLevels.has(grade.level) : selectedGrades.some(selected => selected.level === grade.level)))} onChange={event => setForm(previous => ({ ...previous, gradeIds: event.target.checked ? [...previous.gradeIds, grade._id] : previous.gradeIds.filter(id => id !== grade._id) }))} />{grade.level}. sınıf · {grade.label}{!grade.isActive && " (pasif)"}</label>; })}{grades.filter(grade => form.gradeIds.includes(grade._id) && grade.level > 8).map(grade => <label key={grade._id} className="flex items-center gap-2 text-sm text-amber-800"><input type="checkbox" checked onChange={() => setForm(previous => ({ ...previous, gradeIds: previous.gradeIds.filter(id => id !== grade._id) }))} />{grade.level}. sınıf · {grade.label} — eski taslak seçimi; satışa açılamaz</label>)}{form.gradeIds.filter(id => !grades.some(grade => grade._id === id)).map(id => <label key={id} className="flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" checked onChange={() => setForm(previous => ({ ...previous, gradeIds: previous.gradeIds.filter(value => value !== id) }))} />Silinmiş sınıf — seçimden çıkarın</label>)}{!grades.length && <p className="text-xs text-muted-foreground">Henüz sınıf kaydı yok. Sınıf eklenene kadar taslak olarak kaydedin.</p>}</fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={event => setForm(previous => ({ ...previous, isActive: event.target.checked }))} />Satışa açık — müşteriler görebilir ve satın alabilir</label>
        </fieldset>{formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}<DialogFooter><Button variant="outline" type="button" disabled={!!busy} onClick={() => setDialogOpen(false)}>Vazgeç</Button><Button type="submit" disabled={!!busy}>{busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}{form.isActive ? "Kaydet ve satışa aç" : "Taslağı kaydet"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>;
}
