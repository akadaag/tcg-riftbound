import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthProvider } from "@/features/auth/auth-provider";
import { SaveProvider } from "@/features/save/save-provider";
import { SerwistProvider } from "./serwist";
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
  title: "Riftbound Shop",
  description:
    "Manage your Riftbound card shop — buy stock, open packs, collect cards, upgrade your store.",
  applicationName: "Riftbound Shop",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Riftbound Shop",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0c14" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5fa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <SerwistProvider swUrl="/serwist/sw.js">
          <AuthProvider>
            <SaveProvider>
              <main className="flex flex-1 flex-col pb-[var(--nav-height)]">
                {children}
              </main>
              <BottomNav />
            </SaveProvider>
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
