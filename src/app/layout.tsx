import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthProvider } from "@/features/auth/auth-provider";
import { SaveProvider } from "@/features/save/save-provider";
import { ToastProvider } from "@/components/ui/toast";
import { MotionProvider } from "@/components/ui/motion-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";
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
  userScalable: true,
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
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Inline script to apply saved theme before first paint (prevents FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("riftbound-theme");if(t==="light")document.documentElement.classList.add("light");else if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground flex min-h-dvh flex-col overscroll-none">
        <SerwistProvider swUrl="/serwist/sw.js">
          <ThemeProvider>
            <AuthProvider>
              <SaveProvider>
                <ToastProvider>
                  <MotionProvider>
                    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[var(--nav-height)]">
                      {children}
                    </main>
                    <BottomNav />
                  </MotionProvider>
                </ToastProvider>
              </SaveProvider>
            </AuthProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
