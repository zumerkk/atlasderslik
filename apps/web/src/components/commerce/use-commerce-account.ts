"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-session";

export interface CommerceAccount { id: string; role: string; token: string }
function readAccount(): CommerceAccount | null {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const token = localStorage.getItem("token");
        const id = user?.id || user?._id;
        return id && token && typeof user.role === "string" ? { id: String(id), role: user.role, token } : null;
    } catch { return null; }
}
export function currentCommerceAccount(account: CommerceAccount | null): boolean {
    const current = readAccount();
    return !!account && !!current && account.id === current.id && account.role === current.role && account.token === current.token;
}
export function useCommerceAccount() {
    const [account, setAccount] = useState<CommerceAccount | null>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const sync = () => { const next = readAccount(); setAccount(previous => previous?.id === next?.id && previous?.role === next?.role && previous?.token === next?.token ? previous : next); setReady(true); };
        sync(); window.addEventListener("storage", sync); window.addEventListener("focus", sync); window.addEventListener(AUTH_CHANGED_EVENT, sync);
        return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); window.removeEventListener(AUTH_CHANGED_EVENT, sync); };
    }, []);
    return { account, ready };
}
