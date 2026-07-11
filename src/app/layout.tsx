import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/layout/PWARegister";

export const metadata: Metadata = {
  title: "Monsoon Saathi - AI Safety Companion",
  description: "AI-powered monsoon preparedness and safety assistant",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
