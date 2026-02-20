"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, Users } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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

    useEffect(() => { fetchUsers(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

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
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteUser(user._id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Create Dialog */}
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
        </div>
    );
}
