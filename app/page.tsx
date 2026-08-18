"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "motion/react";
import { useAuth } from "@/components/auth/auth-context";
import { BeadHero } from "@/components/auth/bead-hero";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/logo";

export default function WelcomePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && session) router.replace("/app/dashboard");
  }, [loading, session, router]);

  return (
    <main className="welcome-shell relative">
      <div className="grain-overlay" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-between px-6 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <header className="lg:col-span-2 lg:mb-8 flex items-center justify-between">
          <Wordmark />
          <span className="text-xs text-muted-foreground">Phase 1 · local</span>
        </header>

        <div className="flex flex-col justify-center gap-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              A private record of your Dhikr
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Set a goal.
              <br />
              <span className="bg-gradient-to-r from-gold via-crimson to-crimson-deep bg-clip-text text-transparent">
                Track the journey.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Track your Dhikr intentions, record your progress, and keep your journey with you.
            </p>
          </motion.div>

          <div className="flex justify-center lg:hidden">
            <BeadHero />
          </div>

          <AuthForm />
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <BeadHero />
        </div>
      </div>
    </main>
  );
}
