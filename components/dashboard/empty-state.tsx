"use client";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export function DashboardEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
      <LogoMark size={64} className="opacity-90" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Start with an intention</h2>
        <p className="text-sm text-muted-foreground">
          Create a goal for a Dhikr you'd like to complete over time.
        </p>
      </div>
      <Button variant="crimson" size="lg" onClick={onCreate}>
        <Sparkles className="h-4 w-4" /> Create First Goal
      </Button>
    </div>
  );
}
