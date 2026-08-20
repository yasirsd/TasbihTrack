"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Home, ListChecks, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const items = [
  { href: "/app/dashboard", label: "Home", icon: Home },
  { href: "/app/history", label: "History", icon: ListChecks },
  { href: "/app/insights", label: "Insights", icon: BarChart2 },
  { href: "/app/profile", label: "Profile", icon: User },
];

/**
 * Floating glass tab bar. Refinements this pass:
 *   • Explicit safe-area padding on the outer nav so the pill sits above
 *     the iOS home indicator instead of hugging it.
 *   • Active indicator is a soft muted pill (not a bright glow).
 *   • Icon strokes use stroke-width=1.75 for a slightly more refined weight
 *     than the default 2.
 *   • Add button uses stable size across widths; ring on focus, not glow.
 */
export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden"
    >
      <div className="glass-nav app-bottom-nav pointer-events-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-crimson to-crimson-deep text-white",
            "shadow-[0_8px_20px_-8px_rgba(239,35,60,0.55)] transition-transform active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label="Add progress"
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </button>
        {items.slice(2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ item, active }: { item: (typeof items)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      // `data-active` is what the Clay `.app-bottom-nav a[data-active="true"]`
      // rule keys off — under Clay the selected item shows as an inset
      // well rather than the Standard-mode Motion pill.
      data-active={active ? "true" : undefined}
      className={cn(
        "relative flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="bottom-nav-active"
          className="absolute inset-x-1 inset-y-0.5 rounded-full bg-muted [html[data-ui-style=clay]_&]:hidden"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <Icon className="relative h-[18px] w-[18px]" strokeWidth={1.75} />
      <span className="relative">{item.label}</span>
    </Link>
  );
}
