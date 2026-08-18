"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "motion/react";
import { useAuth } from "@/components/auth/auth-context";
import { BeadHero } from "@/components/auth/bead-hero";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandMark } from "@/components/brand/logo";

/**
 * Authenticated users are redirected to the dashboard before any Sign In UI
 * flashes (§21). Unauthenticated users see the 1011 hero + Sign In form.
 */
export default function WelcomePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && session) router.replace("/app/dashboard");
  }, [loading, session, router]);

  // While the session check is in flight (fast — one server action), avoid
  // rendering the Sign In form to prevent it from flashing for authenticated
  // users refreshing on `/`.
  if (loading || session) {
    return (
      <main className="welcome-shell relative grid min-h-dvh place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-crimson" />
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="welcome-shell relative">
      <div className="grain-overlay" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-between px-6 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="lg:col-span-2" />

        <div className="flex flex-col justify-center gap-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <BrandMark size={56} tone="gradient" title="1011" />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">1011 Tracker</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Track meaningful Dhikr goals, daily progress, and long-term journeys.
            </p>
          </motion.div>

          <div className="flex justify-center lg:hidden">
            <BeadHero />
          </div>

          <div className="mx-auto w-full max-w-md">
            <AuthForm />
          </div>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <BeadHero />
        </div>
      </div>
    </main>
  );
}
