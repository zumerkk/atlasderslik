import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { MerchantIdentity } from "@/components/commerce/merchant-identity";
import { ContactChannels } from "@/components/legal/contact-channels";

export const metadata = { title: "İletişim ve Satıcı Bilgileri" };

export default function ContactPage() {
  return <div className="flex min-h-screen flex-col bg-gray-50/50"><PublicHeader /><main className="flex-1"><section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-14"><div className="mx-auto max-w-4xl px-4 sm:px-6"><p className="mb-3 text-sm text-blue-100">Atlas Derslik · Destek</p><h1 className="text-4xl font-bold text-white">İletişim</h1><p className="mt-4 leading-7 text-white/85">Paketler, siparişler ve öğrenci erişimi hakkında doğrudan bize ulaşın.</p></div></section><section className="mx-auto max-w-4xl space-y-7 px-4 py-12 sm:px-6"><ContactChannels /><MerchantIdentity /><div className="rounded-2xl border bg-white p-6 text-sm leading-7 text-gray-600"><h2 className="mb-2 text-lg font-semibold text-gray-900">Başvurunuz için</h2><p>Sipariş veya erişim sorunlarında sipariş numaranızı ve kayıtlı e-posta adresinizi belirtin. Cayma/iptal/iade bildiriminizi yazılı olarak iletin. Kişisel veri taleplerinde kimliğinizi doğrulamak için gerekli bilgiler ayrıca istenebilir. Kart bilgisi veya hesap şifresi göndermeyin.</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2"><Link className="text-atlas-blue underline" href="/iptal-iade">Teslimat, iptal ve iade</Link><Link className="text-atlas-blue underline" href="/kvkk">Kişisel veri hakları</Link><Link className="text-atlas-blue underline" href="/sss">Sıkça sorulan sorular</Link></div></div></section></main><PublicFooter /></div>;
}
