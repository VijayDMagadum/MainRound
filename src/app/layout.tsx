import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/layout/PWARegister";

export const metadata: Metadata = {
  title: "Monsoon Preparedness & Citizen Assistance - Monsoon Saathi",
  description: "A GenAI-powered solution that helps individuals, families, and communities prepare for the monsoon season. Leverages Generative AI to provide personalized preparedness plans, weather-aware guidance, emergency checklists, travel advisories, safety recommendations, multilingual assistance, and real-time alerts before, during, and after severe weather events.",
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
