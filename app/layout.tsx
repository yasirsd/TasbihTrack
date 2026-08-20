import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { readAppearanceCookie } from "@/lib/appearance/cookie";
import { makePrepaintScript } from "@/lib/appearance/prepaint-script";

export const metadata: Metadata = {
  title: {
    default: "1011 Tracker — Track Your Dhikr Journey",
    template: "%s · 1011 Tracker",
  },
  description:
    "Track meaningful Dhikr goals, daily progress, and long-term journeys.",
  applicationName: "1011 Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "1011 Tracker",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Phase 7.2 P0.2 — iOS Safari does not honour SVG for the
    // apple-touch-icon slot; before this pass it was falling back to a
    // rasterised web-clip preview (the silver "1" tile). We now ship a
    // proper 180×180 PNG for Home Screen installs. Desktop browsers +
    // Android Chrome keep using the crisp SVG favicon.
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-v2-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-v2-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon-v2-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "1011 Tracker",
    description: "Track meaningful Dhikr goals, daily progress, and long-term journeys.",
    siteName: "1011 Tracker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "1011 Tracker",
    description: "Track meaningful Dhikr goals, daily progress, and long-term journeys.",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const appearance = await readAppearanceCookie();
  const prepaint = makePrepaintScript(appearance);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-color-theme={appearance.colorTheme}
      data-ui-style={appearance.uiStyle}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Runs before hydration; picks up the appearance cookie and
         * stamps <html> with data-color-theme / data-ui-style / .dark
         * so returning users never see the default theme flash. */}
        <script dangerouslySetInnerHTML={{ __html: prepaint }} />
      </head>
      <body className="font-sans antialiased">
        <AppProviders appearance={appearance}>{children}</AppProviders>
      </body>
    </html>
  );
}
