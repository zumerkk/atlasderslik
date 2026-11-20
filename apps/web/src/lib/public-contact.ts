"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { commerceJson } from "@/lib/commerce";

/** Public support details supplied by the business; no payment or bank data. */
export const PUBLIC_CONTACT = {
    phone: "+905061193894",
    email: "atlasderslik@gmail.com",
} as const;

export interface PublicContact { phone: string; email: string }

export function contactPhoneLabel(phone: string): string {
    return phone.replace(/^(\+90)(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
}

export function contactEmailHref(contact: PublicContact): string {
    return `mailto:${encodeURIComponent(contact.email)}`;
}

export function contactWhatsAppHref(contact: PublicContact, message: string): string {
    return `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

let cached: { contact: PublicContact; expiresAt: number } | null = null;
let pending: Promise<PublicContact> | null = null;

async function currentPublicContact(): Promise<PublicContact> {
    if (cached && cached.expiresAt > Date.now()) return cached.contact;
    if (!pending) pending = (async () => {
        try {
            const merchant = await commerceJson<unknown>(await apiGet("/payment/merchant", { skipAuth: true, retries: 0, timeout: 15000 }), "İletişim bilgileri alınamadı.");
            const source = merchant && typeof merchant === "object" ? merchant as Record<string, unknown> : {};
            const phone = typeof source.phone === "string" && /^\+90[1-9]\d{9}$/.test(source.phone.trim()) ? source.phone.trim() : PUBLIC_CONTACT.phone;
            const email = typeof source.email === "string" && source.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(source.email.trim()) ? source.email.trim() : PUBLIC_CONTACT.email;
            const contact = { phone, email };
            cached = { contact, expiresAt: Date.now() + 5 * 60 * 1000 };
            return contact;
        } catch {
            cached = { contact: PUBLIC_CONTACT, expiresAt: Date.now() + 30000 };
            return PUBLIC_CONTACT;
        } finally { pending = null; }
    })();
    return pending;
}

/** Share the checkout's current merchant contact, retaining working support links while it loads. */
export function usePublicContact(): PublicContact {
    const [contact, setContact] = useState<PublicContact>(PUBLIC_CONTACT);
    useEffect(() => {
        let disposed = false;
        void currentPublicContact().then(value => { if (!disposed) setContact(value); });
        return () => { disposed = true; };
    }, []);
    return contact;
}
