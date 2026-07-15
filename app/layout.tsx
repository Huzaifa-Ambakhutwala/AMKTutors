import type { Metadata, Viewport } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/providers/QueryProvider";
import FirestoreReadCounter from "@/components/FirestoreReadCounter";
import CursorGlow from "@/components/CursorGlow";
import { Toaster } from "@/components/Toaster";
import { DEFAULT_THEME_COLORS, LOCAL_STORAGE_KEY } from "@/lib/theme-constants";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMK Tutors - Personalized Tutoring",
  description:
    "Personalized Tutoring. Trusted Results. Expert tutors for Math, English, Science, and more.",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#800000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script to apply theme colors before first paint
  // This prevents the flash of incorrect colors on page load
  const themeScript = `
    (function() {
      try {
        var stored = localStorage.getItem('${LOCAL_STORAGE_KEY}');
        var colors = ${JSON.stringify(DEFAULT_THEME_COLORS)};
        
        if (stored) {
          try {
            var parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
              colors = {
                primary: parsed.primary || '${DEFAULT_THEME_COLORS.primary}',
                secondary: parsed.secondary || '${DEFAULT_THEME_COLORS.secondary}',
                accent: parsed.accent || '${DEFAULT_THEME_COLORS.accent}',
                yellow: parsed.yellow || '${DEFAULT_THEME_COLORS.yellow}',
                yellowDark: parsed.yellowDark || '${DEFAULT_THEME_COLORS.yellowDark}',
              };
            }
          } catch (e) {
            // Invalid JSON, use defaults
          }
        }
        
        var root = document.documentElement;
        root.style.setProperty('--theme-primary', colors.primary);
        root.style.setProperty('--theme-secondary', colors.secondary);
        root.style.setProperty('--theme-accent', colors.accent);
        root.style.setProperty('--theme-yellow', colors.yellow);
        root.style.setProperty('--theme-yellow-dark', colors.yellowDark);
      } catch (e) {
        // Silently fail - fallback to CSS defaults
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${openSans.variable} antialiased bg-gray-50 font-sans`}
        suppressHydrationWarning
      >
        <Script
          id="theme-colors"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <QueryProvider>
          <ThemeProvider>
            <CursorGlow glowSize={400} glowIntensity={0.4} glowColor="rgba(255, 255, 255, 0.6)" />
            <ServiceWorkerRegister />
            <Toaster />
            {children}
            <FirestoreReadCounter />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
