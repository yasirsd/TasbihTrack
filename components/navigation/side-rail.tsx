"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Home, ListChecks, Plus, User } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/app/dashboard", label: "Home", icon: Home },
  { href: "/app/history", label: "History", icon: ListChecks },
  { href: "/app/insights", label: "Insights", icon: BarChart2 },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function SideRail({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="fixed left-6 top-6 bottom-6 z-40 hidden w-60 flex-col gap-3 lg:flex">
      <div className="glass-nav flex h-full flex-col gap-6 rounded-3xl p-5">
        <Wordmark />
        <Button variant="crimson" onClick={onAdd} className="justify-start gap-2" size="lg">
          <Plus className="h-4 w-4" /> Add Progress
        </Button>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-xs text-muted-foreground">
          Phase 1 · Local device storage.
        </p>
      </div>
    </aside>
  );
}
