import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3, School } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { MerchantIdentity } from "@/components/commerce/merchant-identity";
import { AddToCartLink } from "@/components/commerce/add-to-cart-link";
import { money, PERIOD_LABELS, type CommercePackage, type PackageGrade } from "@/lib/commerce";
import { PACKAGE_ACCESS_DESCRIPTIONS } from "@/lib/legal-documents";

export const metadata = { title: "Paket Detayı" };

async function catalogueGet(path: string): Promise<Response> {
  const configured = process.env.ATLAS_API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL;
  const base = configured && /^https?:\/\//.test(configured) ? configured.replace(/\/$/, "") : "http://localhost:3001";
  return fetch(`${base}${path}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
}

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const [packageResult, gradesResult] = await Promise.allSettled([
    catalogueGet(`/packages/${encodeURIComponent(id)}`), catalogueGet("/education/grades"),
  ]);
  if (packageResult.status === "fulfilled" && packageResult.value.status === 404) notFound();
  const pkg = packageResult.status === "fulfilled" && packageResult.value.ok
    ? await packageResult.value.json().catch(() => null) as CommercePackage | null : null;
  const gradesData: unknown = gradesResult.status === "fulfilled" && gradesResult.value.ok ? await gradesResult.value.json().catch(() => null) : null;
  const allGrades = Array.isArray(gradesData) ? gradesData as PackageGrade[] : [];
  const grades = allGrades.filter(grade => grade && grade.isActive && pkg?.gradeIds?.includes(grade._id));
  const scopeKnown = !!pkg?.gradeIds?.length && grades.length === pkg.gradeIds.length && grades.every(grade => Number.isInteger(grade.level) && grade.level >= 1 && grade.level <= 8);
  const ready = !!pkg && pkg._id === id && pkg.isActive && typeof pkg.name === "string" && typeof pkg.description === "string" && typeof pkg.price === "number" && Number.isFinite(pkg.price) && pkg.price > 0 && Object.hasOwn(PERIOD_LABELS, pkg.period);
  const hasDiscount = ready && typeof pkg.originalPrice === "number" && pkg.originalPrice > pkg.price;
  return <div className="flex min-h-screen flex-col bg-gray-50/50"><PublicHeader /><main className="flex-1 pt-28 pb-16"><div className="mx-auto max-w-6xl px-4 sm:px-6"><Link href="/packages" className="mb-7 inline-flex items-center gap-2 text-sm text-atlas-blue"><ArrowLeft className="h-4 w-4" />Tüm paketler</Link>{ready ? <>
    <div className="grid items-start gap-7 lg:grid-cols-[1fr_360px]">
      <article className="space-y-7 rounded-2xl border bg-white p-6 sm:p-9">{pkg.badge ? <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-atlas-blue">{pkg.badge}</span> : null}<div><h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">{pkg.name}</h1>{pkg.subtitle ? <p className="mt-4 text-lg leading-7 text-gray-500">{pkg.subtitle}</p> : null}</div><section><h2 className="mb-3 text-lg font-semibold">Paket açıklaması</h2><p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">{pkg.description}</p></section>
        {Array.isArray(pkg.features) && pkg.features.length > 0 ? <section><h2 className="mb-4 text-lg font-semibold">Pakete dâhil olanlar</h2><ul className="space-y-3">{pkg.features.map((feature, index) => <li key={index} className="flex gap-3 text-sm leading-6 text-gray-600"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></li>)}</ul></section> : null}
        <section className="rounded-xl bg-gray-50 p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><School className="h-5 w-5 text-atlas-blue" />Sınıf kapsamı</h2>{scopeKnown ? <ul className="space-y-2 text-sm text-gray-600">{grades.map(grade => <li key={grade._id}>{grade.level}. Sınıf{grade.label ? ` · ${grade.label}` : ""}</li>)}</ul> : <p className="text-sm text-amber-800">Sınıf bilgileri şu anda doğrulanamadı. Satın almadan önce paket kataloğunu yeniden kontrol edin.</p>}<p className="mt-4 text-xs leading-6 text-gray-500">Paket, yukarıdaki sınıf kapsamı içindir. Öğrencinin güncel sınıfı ve uygunluğu sepette tekrar kontrol edilir; diğer sınıf seviyeleri otomatik eklenmez.</p></section>
        <section><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Clock3 className="h-5 w-5 text-atlas-blue" />Erişim ve teslim</h2><p className="text-sm leading-7 text-gray-600">{PACKAGE_ACCESS_DESCRIPTIONS[pkg.period]}</p><p className="mt-3 text-sm leading-7 text-gray-600">Ödeme doğrulanıp öğrenciye sınıf kaydı yapıldığında erişim hesap üzerinden açılır. Fiziksel gönderim ve kargo yoktur. Canlı derslerin saatleri öğrencinin ders programında gösterilir. Kullanılabilen içerik ve özellikler bu paketin açıklamasıyla sınırlıdır.</p></section>
      </article>
      <aside className="space-y-5 lg:sticky lg:top-28"><section className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-medium text-gray-500">{PERIOD_LABELS[pkg.period]} paket · tek ödeme</p>{hasDiscount ? <p className="mt-4 text-sm text-gray-400 line-through">{money(pkg.originalPrice)}</p> : null}<p className="mt-2 text-4xl font-bold text-gray-900">{money(pkg.price)}</p><p className="mt-3 text-sm leading-6 text-gray-500">Vergiler dâhil toplam fiyat. Otomatik yenileme yapılmaz. Mevcut ödeme akışı tek çekimdir.</p>{scopeKnown ? <AddToCartLink packageId={pkg._id} className="mt-6 w-full rounded-xl bg-atlas-blue py-6 font-semibold text-white hover:bg-blue-700">Sepete ekle<ArrowRight className="h-4 w-4" /></AddToCartLink> : <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Sınıf kapsamı doğrulanana kadar sepete eklenemez.</p>}<p className="mt-3 text-xs leading-6 text-gray-500">Satın alma için öğrenci/veli hesabı gerekir. Veli, hesabına bağlı öğrenciyi seçebilir.</p><div className="mt-5 space-y-2 border-t pt-4 text-xs text-atlas-blue"><Link className="block underline" href="/on-bilgilendirme">Ön bilgilendirme</Link><Link className="block underline" href="/mesafeli-satis-sozlesmesi">Mesafeli satış sözleşmesi</Link><Link className="block underline" href="/iptal-iade">Teslimat, iptal ve iade</Link><Link className="block underline" href="/iletisim">Paket hakkında bilgi alın</Link></div></section><MerchantIdentity /></aside>
    </div>
  </> : <section className="rounded-2xl border bg-white p-8"><h1 className="text-2xl font-semibold">Paket bilgileri alınamadı</h1><p className="mt-3 text-sm leading-7 text-gray-600">Güncel paket bilgisi doğrulanamadığı için satın alma bağlantısı gösterilemiyor. Lütfen paket listesini yeniden açın.</p><Link href="/packages" className="mt-5 inline-block text-atlas-blue underline">Paketlere dön</Link></section>}</div></main><PublicFooter /></div>;
}
