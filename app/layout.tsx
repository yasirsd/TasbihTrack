import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers";

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
    icon: [{ url: "/icons/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
