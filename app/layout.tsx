import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Orbitly",
  description: "오늘의 루틴과 할 일을 Orbitly에서 가볍게 정리하세요.",
  applicationName: "Orbitly",
  appleWebApp: { capable: true, title: "Orbitly", statusBarStyle: "default" },
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: { title: "Orbitly", description: "오늘의 루틴과 할 일을 가볍게 정리합니다.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><head><link rel="manifest" href="/manifest.webmanifest" /></head><body>{children}</body></html>; }
