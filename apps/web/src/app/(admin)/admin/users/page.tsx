"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, Users, MoreHorizontal, Key, Shuffle, Lock, Copy, Eye, EyeOff } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface User {
    _id: string; email: string; firstName?: string; lastName?: string;
    role: string; isActive: boolean; createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "STUDENT" });

    // Password management state
    const [passwordDialog, setPasswordDialog] = useState<"set" | "show" | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [manualPassword, setManualPassword] = useState("");
    const [showManualPassword, setShowManualPassword] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [copied, setCopied] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    useEffect(() => { fetchUsers(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 4000); return () => clearTimeout(t); } }, [feedback]);

    const fetchUsers = async () => {
        try {
            const res = await apiGet("/users");
            if (res.ok) setUsers(await res.json());
        } catch (error) { console.error("Failed to fetch users", error); }
        finally { setLoading(false); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/users", newUser);
            if (res.ok) {
                setIsDialogOpen(false);
                setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "STUDENT" });
                setFeedback({ type: "success", message: "Kullanıcı başarıyla oluşturuldu!" });
                fetchUsers();
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Kullanıcı oluşturulamadı." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
        try {
            const res = await apiDelete(`/users/${id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Kullanıcı silindi." }); fetchUsers(); }
            else { setFeedback({ type: "error", message: "Kullanıcı silinemedi." }); }
        } catch { console.error("Failed to delete user"); }
    };

    // ─── Password Management Handlers ─────────────────────────

    const handleGeneratePassword = async (user: User) => {
        setPasswordSubmitting(true);
        setSelectedUser(user);
        try {
            const res = await apiPost(`/users/${user._id}/generate-password`, {});
            if (res.ok) {
                const data = await res.json();
                setGeneratedPassword(data.temporaryPassword);
                setPasswordDialog("show");
                setFeedback({ type: "success", message: `${user.firstName} ${user.lastName} için şifre oluşturuldu.` });
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Şifre oluşturulamadı." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setPasswordSubmitting(false); }
    };

    const handleResetPassword = async (user: User) => {
        if (!confirm(`${user.firstName} ${user.lastName} kullanıcısının şifresini sıfırlamak istediğinize emin misiniz?`)) return;
        setPasswordSubmitting(true);
        setSelectedUser(user);
        try {
            const res = await apiPost(`/users/${user._id}/reset-password`, {});
            if (res.ok) {
                const data = await res.json();
                setGeneratedPassword(data.temporaryPassword);
                setPasswordDialog("show");
                setFeedback({ type: "success", message: `${user.firstName} ${user.lastName} için şifre sıfırlandı.` });
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Şifre sıfırlanamadı." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setPasswordSubmitting(false); }
    };

    const openSetPasswordDialog = (user: User) => {
        setSelectedUser(user);
        setManualPassword("");
        setShowManualPassword(false);
        setPasswordDialog("set");
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setPasswordSubmitting(true);
        try {
            const res = await apiPost(`/users/${selectedUser._id}/set-password`, { password: manualPassword });
            if (res.ok) {
                setPasswordDialog(null);
                setManualPassword("");
                setFeedback({ type: "success", message: `${selectedUser.firstName} ${selectedUser.lastName} için şifre güncellendi.` });
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Şifre güncellenemedi." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setPasswordSubmitting(false); }
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = generatedPassword;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Password strength indicator
    const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
        if (!pw) return { label: "", color: "", width: "0%" };
        if (pw.length < 8) return { label: "Zayıf", color: "bg-rose-500", width: "25%" };
        const hasLetter = /[a-zA-Z]/.test(pw);
        const hasDigit = /[0-9]/.test(pw);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
        const score = [hasLetter, hasDigit, hasSpecial, pw.length >= 10].filter(Boolean).length;
        if (score <= 1) return { label: "Zayıf", color: "bg-rose-500", width: "25%" };
        if (score === 2) return { label: "Orta", color: "bg-amber-500", width: "50%" };
        if (score === 3) return { label: "Güçlü", color: "bg-emerald-500", width: "75%" };
        return { label: "Çok Güçlü", color: "bg-emerald-600", width: "100%" };
    };

    const roleLabel = (role: string) => {
        const map: Record<string, string> = { ADMIN: "Yönetici", TEACHER: "Öğretmen", STUDENT: "Öğrenci", PARENT: "Veli" };
        return map[role] || role;
    };

    const roleBadgeVariant = (role: string): "default" | "info" | "success" | "warning" => {
        const map: Record<string, "default" | "info" | "success" | "warning"> = {
            ADMIN: "default", TEACHER: "info", STUDENT: "success", PARENT: "warning",
        };
        return map[role] || "default";
    };

    const strength = getPasswordStrength(manualPassword);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Kullanıcılar" description="Sistemdeki tüm kullanıcıları yönetin.">
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Yeni Kullanıcı
                </Button>
            </PageHeader>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
            ) : users.length === 0 ? (
                <EmptyState icon={Users} title="Henüz kullanıcı yok" description="Yeni bir kullanıcı ekleyerek başlayın." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ad Soyad</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>Kayıt Tarihi</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user._id}>
                                <TableCell className="font-semibold">{user.firstName} {user.lastName}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? "success" : "destructive"}>
                                        {user.isActive ? "Aktif" : "Pasif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Password Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Şifre Yönetimi</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleGeneratePassword(user)} className="gap-2">
                                                    <Shuffle className="h-4 w-4" />
                                                    Random Şifre Oluştur
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openSetPasswordDialog(user)} className="gap-2">
                                                    <Lock className="h-4 w-4" />
                                                    Manuel Şifre Ata
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleResetPassword(user)} className="gap-2 text-amber-600 focus:text-amber-700">
                                                    <Key className="h-4 w-4" />
                                                    Şifre Sıfırla
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Delete */}
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteUser(user._id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* ═══ Create User Dialog ═══ */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                        <DialogDescription>Kullanıcı bilgilerini girin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">Ad</Label>
                            <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">Soyad</Label>
                            <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Şifre</Label>
                            <Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select value={newUser.role} onValueChange={(value: string) => setNewUser({ ...newUser, role: value })}>
                                <SelectTrigger><SelectValue placeholder="Rol seçin" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STUDENT">Öğrenci</SelectItem>
                                    <SelectItem value="PARENT">Veli</SelectItem>
                                    <SelectItem value="TEACHER">Öğretmen</SelectItem>
                                    <SelectItem value="ADMIN">Yönetici</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══ Set Password Dialog ═══ */}
            <Dialog open={passwordDialog === "set"} onOpenChange={(open) => { if (!open) setPasswordDialog(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manuel Şifre Ata</DialogTitle>
                        <DialogDescription>
                            {selectedUser && <><strong>{selectedUser.firstName} {selectedUser.lastName}</strong> için yeni şifre belirleyin.</>}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSetPassword} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="manual-password">Yeni Şifre</Label>
                            <div className="relative">
                                <Input
                                    id="manual-password"
                                    type={showManualPassword ? "text" : "password"}
                                    value={manualPassword}
                                    onChange={(e) => setManualPassword(e.target.value)}
                                    placeholder="En az 8 karakter, harf + rakam"
                                    required
                                    minLength={8}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowManualPassword(!showManualPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showManualPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {/* Strength indicator */}
                            {manualPassword && (
                                <div className="space-y-1">
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Güç: {strength.label}</p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setPasswordDialog(null)}>İptal</Button>
                            <Button type="submit" disabled={passwordSubmitting || manualPassword.length < 8}>
                                {passwordSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Şifreyi Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══ Show Generated Password Dialog ═══ */}
            <Dialog open={passwordDialog === "show"} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setGeneratedPassword(""); setCopied(false); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Şifre Oluşturuldu</DialogTitle>
                        <DialogDescription>
                            {selectedUser && <><strong>{selectedUser.firstName} {selectedUser.lastName}</strong> için yeni şifre aşağıdadır. Bu şifreyi kopyalayın — bu pencere kapatıldıktan sonra tekrar görüntülenemez.</>}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <code className="flex-1 text-lg font-mono font-bold text-gray-900 tracking-wider select-all">
                                {generatedPassword}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyPassword}
                                className={`shrink-0 transition-all ${copied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}
                            >
                                {copied ? (
                                    <><CheckCircle className="h-4 w-4" /> Kopyalandı</>
                                ) : (
                                    <><Copy className="h-4 w-4" /> Kopyala</>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Bu şifre sadece bir kez gösterilir. Lütfen güvenli bir şekilde saklayın.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => { setPasswordDialog(null); setGeneratedPassword(""); setCopied(false); }}>
                            Tamam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
