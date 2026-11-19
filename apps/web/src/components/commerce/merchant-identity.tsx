"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { commerceJson, type CommerceMerchant } from "@/lib/commerce";

export function MerchantIdentity({ merchant, historical = false }: { merchant?: CommerceMerchant; historical?: boolean }) {
    const [current, setCurrent] = useState<CommerceMerchant | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController(); if (merchant) return () => controller.abort();
        void (async () => { try { const data = await commerceJson<CommerceMerchant>(await apiGet("/payment/merchant", { skipAuth: true, signal: controller.signal, retries: 0 }), "Satıcı bilgileri alınamadı."); if (!controller.signal.aborted) setCurrent(data); } catch { if (!controller.signal.aborted) setError("Satıcı bilgileri şu an doğrulanamıyor."); } })();
        return () => controller.abort();
    }, [merchant]);
    const seller = merchant || current;
    return <section className="rounded-xl border bg-muted/20 p-4 text-sm space-y-2" aria-label="Satıcı bilgileri"><h2 className="font-semibold">Satıcı {historical && !merchant ? "· güncel kayıt" : "bilgileri"}</h2>{seller ? <><p>{seller.title || seller.brand}</p><p className="text-xs text-muted-foreground">Vergi no: {seller.taxNumber || "Henüz belirtilmedi"} · Vergi dairesi: {seller.taxOffice || "Henüz belirtilmedi"}</p><p className="whitespace-pre-wrap text-xs">{seller.address || "Satıcı adresi henüz tamamlanmadı."}</p><div className="flex flex-wrap gap-3 text-xs">{seller.email && <a className="underline" href={`mailto:${encodeURIComponent(seller.email)}`}>{seller.email}</a>}{seller.phone && <a className="underline" href={`tel:${seller.phone.replace(/[^+\d]/g, "")}`}>{seller.phone}</a>}</div>{!seller.complete && <p className="text-xs text-amber-800">Satıcının resmî bilgileri henüz tamamlanmadı.</p>}{historical && !merchant && <p className="text-xs text-muted-foreground">Bu eski siparişte satıcı bilgisi anlık kaydı bulunmuyor; yukarıda güncel kurum bilgisi gösteriliyor.</p>}</> : <p className="text-xs text-muted-foreground" role={error ? "status" : undefined}>{error || "Satıcı bilgileri yükleniyor…"}</p>}</section>;
}
