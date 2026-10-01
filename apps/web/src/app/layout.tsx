import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ESKA.ERP", template: "%s | ESKA.ERP" },
  description: "ESKA Grup operasyonlarını tek merkezden yöneten ERP platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}><body><Providers>{children}</Providers></body></html>;
}
