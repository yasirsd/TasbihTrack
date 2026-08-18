"use client";
import * as React from "react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";
import { ServiceWorker } from "@/components/pwa/service-worker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorker />
      </ToastProvider>
    </ThemeProvider>
  );
}
