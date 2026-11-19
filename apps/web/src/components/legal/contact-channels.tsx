"use client";

import { Mail, Phone } from "lucide-react";
import { contactEmailHref, contactPhoneLabel, usePublicContact } from "@/lib/public-contact";

export function ContactChannels() {
  const contact = usePublicContact();
  return <div className="grid gap-4 sm:grid-cols-2">
    <a href={contactEmailHref(contact)} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-atlas-blue"><Mail className="mb-4 h-6 w-6 text-atlas-blue" /><h2 className="font-semibold text-gray-900">E-posta ile yazın</h2><p className="mt-2 break-all text-sm text-atlas-blue">{contact.email}</p><p className="mt-3 text-sm leading-6 text-gray-500">Sipariş, erişim, iptal/iade ve kişisel veri başvurularınız için yazılı iletişim.</p></a>
    <a href={`tel:${contact.phone}`} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-atlas-blue"><Phone className="mb-4 h-6 w-6 text-atlas-blue" /><h2 className="font-semibold text-gray-900">Telefonla ulaşın</h2><p className="mt-2 text-sm text-atlas-blue">{contactPhoneLabel(contact.phone)}</p><p className="mt-3 text-sm leading-6 text-gray-500">Paket seçimi, sınıf uygunluğu ve hesabınıza erişim konularında bilgi alın.</p></a>
  </div>;
}
