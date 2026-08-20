"use client";
import * as React from "react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { AppearanceProvider } from "@/components/appearance/appearance-provider";
import type { Appearance } from "@/lib/appearance/types";
import { KeyboardScope } from "@/components/keyboard-scope";

export function AppProviders({
  appearance,
  children,
}: {
  appearance: Appearance;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={appearance.colorMode}
      enableSystem
      disableTransitionOnChange
    >
      <ToastProvider>
        <AuthProvider>
          <AppearanceProvider initial={appearance}>
            <KeyboardScope />
            {children}
          </AppearanceProvider>
        </AuthProvider>
        <ServiceWorker />
      </ToastProvider>
    </ThemeProvider>
  );
}
