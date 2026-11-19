"use client";

import { Printer } from "lucide-react";
import { MerchantIdentity } from "@/components/commerce/merchant-identity";
import { LEGAL_UPDATED_AT } from "@/lib/legal-documents";

export function LegalDocumentInfo({ version }: { version: string }) {
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
      <p>Güncelleme: {LEGAL_UPDATED_AT} · Sürüm: {version}</p>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50 print:hidden"><Printer className="h-4 w-4" /> Yazdır / PDF kaydet</button>
    </div>
    <MerchantIdentity />
  </div>;
}
