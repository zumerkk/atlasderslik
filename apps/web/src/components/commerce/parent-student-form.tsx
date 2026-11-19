"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { commerceJson } from "@/lib/commerce";
import { currentCommerceAccount, type CommerceAccount } from "./use-commerce-account";

export function ParentStudentForm({ account, onCreated, initiallyOpen = false }: { account: CommerceAccount; onCreated: (id: string) => Promise<void>; initiallyOpen?: boolean }) {
    const [open, setOpen] = useState(initiallyOpen);
    const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", grade: "5", guardianConsent: false });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const pending = useRef(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); if (pending.current || !currentCommerceAccount(account)) return; setError(""); setNotice("");
        if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) { setError("Öğrencinin adını ve soyadını en az ikişer karakterle girin."); return; }
        if (form.password !== form.confirmPassword || form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) { setError("Şifreler eşleşmeli; en az 8 karakter, bir harf ve bir rakam içermelidir."); return; }
        if (!form.guardianConsent) { setError("Veli/yasal temsilci bildiriminizi onaylayın."); return; }
        pending.current = true; setBusy(true); const controller = new AbortController(); request.current = controller;
        try {
            const student = await commerceJson<{ id?: string; _id?: string }>(await apiPost("/auth/students", { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), password: form.password, grade: Number(form.grade), guardianConsent: true }, { retries: 0, timeout: 45000, signal: controller.signal }), "Öğrenci hesabı oluşturulamadı.");
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            const id = student.id || student._id;
            if (!id || !/^[a-f0-9]{24}$/i.test(id)) throw new Error("Öğrenci yanıtı doğrulanamadı. Yeniden hesap açmadan öğrenci listesini kontrol edin.");
            setForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", grade: "5", guardianConsent: false });
            await onCreated(id); setOpen(false); setNotice("Öğrenci hesabı oluşturuldu. Öğrenciyi seçip paketi sepetinize ekleyebilirsiniz.");
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Bağlantı kesildi. Öğrenci hesabı oluşmuş olabilir; yeniden denemeden listeyi yenileyin."); }
        finally { pending.current = false; if (!controller.signal.aborted && currentCommerceAccount(account)) setBusy(false); }
    };
    return <section className="rounded-2xl border bg-white p-5 space-y-4">{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Öğrenci hesapları</h2><p className="text-xs text-muted-foreground mt-1">Yeni hesabı yalnızca velisi/yasal temsilcisi olduğunuz öğrenci için oluşturun.</p></div><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(value => !value)} aria-expanded={open}><UserPlus className="h-4 w-4" />{open ? "Formu kapat" : "Öğrenci hesabı oluştur"}</Button></div>
        {open && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4"><div className="grid sm:grid-cols-2 gap-3">{([['firstName', 'Öğrencinin adı'], ['lastName', 'Öğrencinin soyadı']] as const).map(([field, label]) => <div key={field} className="space-y-2"><Label htmlFor={`child-${field}`}>{label}</Label><Input id={`child-${field}`} required minLength={2} maxLength={80} autoComplete="off" value={form[field]} onChange={event => setForm(previous => ({ ...previous, [field]: event.target.value }))} /></div>)}</div><div className="space-y-2"><Label htmlFor="child-email">Öğrencinin giriş e-postası</Label><Input id="child-email" type="email" required maxLength={254} autoComplete="off" value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /><p className="text-xs text-muted-foreground">Veli hesabından farklı ve kullanılmamış bir e-posta olmalıdır. Kayıtlı bir öğrenciyi e-posta ile hesabınıza bağlamaz.</p></div><div className="space-y-2"><Label htmlFor="child-grade">Öğrencinin sınıfı</Label><select id="child-grade" className="h-11 w-full rounded-xl border px-3" required value={form.grade} onChange={event => setForm(previous => ({ ...previous, grade: event.target.value }))}>{Array.from({ length: 8 }, (_, index) => index + 1).map(grade => <option key={grade} value={grade}>{grade}. sınıf</option>)}</select></div><div className="grid sm:grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="child-password">Öğrencinin giriş şifresi</Label><Input id="child-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="child-confirm">Şifre tekrarı</Label><Input id="child-confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.confirmPassword} onChange={event => setForm(previous => ({ ...previous, confirmPassword: event.target.value }))} /></div></div><label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" checked={form.guardianConsent} onChange={event => setForm(previous => ({ ...previous, guardianConsent: event.target.checked }))} /><span>Bu öğrencinin velisi/yasal temsilcisiyim; öğrenci hesabı oluşturulması için gerekli yetkiye sahibim. <Link href="/kvkk" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">Kişisel veri bilgilendirmesini</Link> okudum.</span></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Button type="submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{busy ? "Hesap oluşturuluyor…" : "Öğrenci hesabını oluştur"}</Button></fieldset></form>}
    </section>;
}
