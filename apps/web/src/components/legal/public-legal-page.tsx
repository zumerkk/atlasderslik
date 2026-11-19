import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { LegalDocumentInfo } from "@/components/legal/legal-document-info";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export function PublicLegalPage({ document, intro, children }: { document: keyof typeof LEGAL_DOCUMENTS; intro: string; children: ReactNode }) {
  const info = LEGAL_DOCUMENTS[document];
  return <div className="flex min-h-screen flex-col bg-gray-50/50">
    <div className="print:hidden"><PublicHeader /></div>
    <main className="flex-1">
      <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-14 print:bg-none print:pt-4 print:pb-3">
        <div className="mx-auto max-w-4xl px-4 sm:px-6"><p className="mb-3 text-sm font-medium text-blue-100 print:text-gray-700">Atlas Derslik · Bilgilendirme</p><h1 className="text-3xl font-bold text-white sm:text-4xl print:text-gray-900">{info.title}</h1><p className="mt-4 max-w-3xl text-white/85 leading-relaxed print:text-gray-700">{intro}</p></div>
      </section>
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-9"><LegalDocumentInfo version={info.version} /><div className="mt-9 space-y-8">{children}</div></div>
        <nav aria-label="İlgili yasal bilgiler" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm print:hidden">{Object.entries(LEGAL_DOCUMENTS).filter(([key]) => key !== document).map(([key, item]) => <Link key={key} href={item.href} className="text-atlas-blue underline underline-offset-4">{item.title}</Link>)}<Link href="/iletisim" className="text-atlas-blue underline underline-offset-4">İletişim</Link></nav>
      </article>
    </main>
    <div className="print:hidden"><PublicFooter /></div>
  </div>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 text-sm leading-7 text-gray-600 [&_a]:text-atlas-blue [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"><h2 className="text-lg font-semibold text-gray-900">{title}</h2>{children}</section>;
}
