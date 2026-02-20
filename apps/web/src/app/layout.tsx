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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
