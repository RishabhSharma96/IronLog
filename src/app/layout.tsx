import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "IronLog",
  description: "Workout tracker for weekly strength training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebas.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#0f0f0f] font-sans text-zinc-100">
        {children}
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
