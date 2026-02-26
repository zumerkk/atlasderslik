import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
// Extract just the origin (protocol + host) for preconnect
const apiOrigin = API_URL ? new URL(API_URL).origin : "";

export const metadata: Metadata = {
  title: {
    default: "Atlas Derslik | Eğitimin Dijital Atlası",
    template: "%s | Atlas Derslik",
  },
  description: "Canlı dersler, video kütüphanesi, ödev takibi ve gelişim raporları ile yapay zeka destekli online eğitim platformu.",
  keywords: ["online eğitim", "canlı ders", "lgs hazırlık", "video ders", "atlas derslik", "okul yönetim sistemi"],
  authors: [{ name: "Atlas Derslik Ekibi" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://atlasderslik.com",
    title: "Atlas Derslik | Eğitimin Dijital Atlası",
    description: "Ortaokul öğrencileri için yeni nesil eğitim platformu.",
    siteName: "Atlas Derslik",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas Derslik",
    description: "Eğitimin Dijital Atlası",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        {/* DNS prefetch & preconnect for API — reduces cold-start latency */}
        {apiOrigin && (
          <>
            <link rel="dns-prefetch" href={apiOrigin} />
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
