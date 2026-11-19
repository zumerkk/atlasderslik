import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function PackageNotFound() {
  return <div className="flex min-h-screen flex-col"><PublicHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-36 pb-20"><p className="text-sm font-semibold text-atlas-blue">Paket bulunamadı</p><h1 className="mt-3 text-3xl font-bold">Bu paket şu anda satışta değil</h1><p className="mt-4 leading-7 text-gray-600">Bağlantı hatalı olabilir veya paket yayından kaldırılmış olabilir. Güncel seçenekleri paket kataloğundan inceleyebilirsiniz.</p><Link className="mt-6 inline-block rounded-xl bg-atlas-blue px-5 py-3 font-medium text-white" href="/packages">Paketleri incele</Link></main><PublicFooter /></div>;
}
