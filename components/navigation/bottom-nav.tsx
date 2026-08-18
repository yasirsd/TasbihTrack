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

export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden"
    >
      <div className="glass-nav pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full px-3 py-2 shadow-2xl">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-crimson to-crimson-deep text-white shadow-[0_10px_25px_-10px_rgba(239,35,60,0.6)] transition-transform active:scale-95"
          aria-label="Add progress"
        >
          <Plus className="h-5 w-5" />
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
      className={cn(
        "relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[10px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="bottom-nav-active"
          className="absolute inset-0 rounded-full bg-muted"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <Icon className="relative h-5 w-5" />
      <span className="relative">{item.label}</span>
    </Link>
  );
}
