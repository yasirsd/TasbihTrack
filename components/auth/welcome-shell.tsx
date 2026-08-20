"use client";
import * as React from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { TasbihHero } from "@/components/auth/tasbih-hero";
import { BrandMark } from "@/components/brand/logo";

/**
 * Welcome shell — Phase 5 P0 UX rescue.
 *
 * • No Motion entrance on the card itself. Auth is the very first paint —
 *   opacity-in animation delayed the tap-response of the Sign In segment
 *   noticeably on mid-range Android devices during owner testing.
 * • Registration mode signals down via context — the Tasbih visual auto-
 *   compacts because registration has more fields.
 * • Layout uses dvh so the form always sits above the fold before the
 *   keyboard opens.
 */
export function WelcomeShell() {
  const [compact, setCompact] = React.useState(false);
  return (
    <main
      className="welcome-shell relative"
      style={{ minHeight: "100dvh" }}
    >
      <div className="grain-overlay" />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-6xl grid-rows-[auto_1fr_auto] gap-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] lg:grid-cols-2 lg:grid-rows-1 lg:items-center lg:gap-16 lg:pt-8">
        <header className="row-start-1 flex flex-col items-center gap-2 pt-1 text-center lg:col-span-2 lg:pt-0">
          <BrandMark size={44} tone="gradient" title="1011" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">1011 Tracker</h1>
        </header>

        <div className="row-start-2 flex min-h-0 flex-col items-center justify-start gap-4 lg:col-span-2 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
          <div className="hidden shrink-0 lg:block">
            <TasbihHero compact={compact} />
          </div>
          <div className="flex w-full max-w-md flex-col items-stretch gap-3">
            <div className="mx-auto flex w-full max-w-[240px] justify-center lg:hidden">
              <TasbihHero compact={compact} />
            </div>
            <div className="mx-auto w-full max-w-md">
              <AuthForm onModeChange={(m) => setCompact(m === "signUp")} />
            </div>
          </div>
        </div>

        <p className="row-start-3 pb-1 text-center text-xs text-muted-foreground lg:hidden">
          Track meaningful Dhikr goals, daily progress, and long-term journeys.
        </p>
      </div>
    </main>
  );
}
