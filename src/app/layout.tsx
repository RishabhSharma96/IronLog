import type { Metadata } from "next";
import { Rajdhani, Orbitron } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700", "900"],
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
    <html lang="en" className={`${rajdhani.variable} ${orbitron.variable}`}>
      <body className="min-h-screen font-sans text-light antialiased">
        {children}
        <Toaster
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "#0f1118",
              border: "1px solid rgba(0, 240, 255, 0.15)",
              color: "#d8ddf0",
              fontFamily: "Rajdhani, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
