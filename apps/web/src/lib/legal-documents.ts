export const LEGAL_UPDATED_AT = "30 Ekim 2026";

export const LEGAL_DOCUMENTS = {
  terms: { title: "Kullanım Şartları", href: "/kullanim-sartlari", version: "terms-v2026-10-30" },
  privacy: { title: "Gizlilik Politikası", href: "/gizlilik-politikasi", version: "privacy-v2026-10-30" },
  salesAgreement: { title: "Mesafeli Satış Sözleşmesi", href: "/mesafeli-satis-sozlesmesi", version: "sales-v2026-10-30" },
  preInformation: { title: "Ön Bilgilendirme", href: "/on-bilgilendirme", version: "preinfo-v2026-10-30" },
  refund: { title: "Teslimat, İptal ve İade", href: "/iptal-iade", version: "refund-v2026-10-30" },
  kvkk: { title: "KVKK Aydınlatma Metni", href: "/kvkk", version: "kvkk-v2026-10-30" },
} as const;

export const LEGAL_SOURCES = {
  distanceSales: "https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme",
  consumerLaw: "https://tuketici.ticaret.gov.tr/data/5e81982d13b876a1b04c7a42/2023-6502%20Say%C4%B1l%C4%B1%20T%C3%BCketicinin%20Korunmas%C4%B1%20Hakk%C4%B1nda%20Kanun.pdf",
  dataRights: "https://www.kvkk.gov.tr/Icerik/2036/Ilgili-Kisinin-Haklari",
  dataNotice: "https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-",
  dataProcessing: "https://www.kvkk.gov.tr/Icerik/2050/Kisisel-Veriler",
  dataTransfer: "https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim",
  dataApplications: "https://www.kvkk.gov.tr/Icerik/2046/Ilgili-Kisiler-Tarafindan-Yapilan-Basvurularin-Cevaplanmasi-Yukumlulugu",
} as const;

export const PACKAGE_ACCESS_DESCRIPTIONS = {
  monthly: "Doğrulanmış ödeme tarihinden itibaren 1 takvim ayı erişim. Bitiş ayında aynı gün yoksa ayın son günü esas alınır.",
  yearly: "Doğrulanmış ödeme tarihinden itibaren 12 takvim ayı erişim. Bitiş ayında aynı gün yoksa ayın son günü esas alınır.",
  "one-time": "Tek ödemeyle, satın alınan sınıf kapsamına süre sonu tanımlanmadan erişim. Sonraki sınıf seviyeleri veya ayrı paketler dâhil değildir.",
} as const;
