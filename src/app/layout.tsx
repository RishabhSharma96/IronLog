import type { Metadata, Viewport } from "next";
import { Rajdhani, Orbitron } from "next/font/google";
import { Toaster } from "sonner";
import { MusicPlayer } from "@/components/music-player";
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

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "IronLog";
const APP_DESCRIPTION = "Workout tracker for weekly strength training";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1118",
  colorScheme: "dark",
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
        <MusicPlayer />
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
