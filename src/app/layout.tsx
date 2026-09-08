import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  openGraph: { siteName: brand.name, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser chrome (mobile URL bar, etc.) matches the page in both themes.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
  ],
};

// Runs before first paint: a manual choice from localStorage wins, otherwise
// follow the OS. Inline so there is never a flash of the wrong theme.
const themeInit = `(function(){try{var t=localStorage.getItem("btc-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme is stamped client-side pre-paint.
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-royal-600 focus:px-4 focus:py-2 focus:text-sm focus:text-on-accent"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
