"use client";
import * as React from "react";
import { motion } from "motion/react";
import { AuthForm } from "@/components/auth/auth-form";
import { TasbihHero } from "@/components/auth/tasbih-hero";
import { BrandMark } from "@/components/brand/logo";

/**
 * Client welcome shell — everything below the server auth gate.
 *
 * Layout is height-aware so the hero collapses on short phones and the
 * Sign In form always sits above the fold before the keyboard opens.
 *
 * Registration mode signals down via context — the Tasbih visual auto-
 * compacts because registration has more fields.
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
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="row-start-1 flex flex-col items-center gap-2 pt-1 text-center lg:col-span-2 lg:pt-0"
        >
          <BrandMark size={44} tone="gradient" title="1011" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">1011 Tracker</h1>
        </motion.header>

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
