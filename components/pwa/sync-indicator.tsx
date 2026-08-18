"use client";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useData } from "@/components/data/data-context";

export function SyncIndicator() {
  const { sync, pendingCount } = useData();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (sync === "syncing" || sync === "error" || pendingCount > 0) {
      setVisible(true);
      if (sync === "syncing" && pendingCount === 0) {
        const timer = setTimeout(() => setVisible(false), 1500);
        return () => clearTimeout(timer);
      }
      if (sync === "error" && pendingCount === 0) {
        const timer = setTimeout(() => setVisible(false), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [sync, pendingCount]);

  const label =
    pendingCount > 0
      ? `${pendingCount} pending`
      : sync === "syncing"
        ? "Syncing…"
        : sync === "error"
          ? "Couldn't sync."
          : null;

  return (
    <AnimatePresence>
      {visible && label && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur">
            {pendingCount > 0 ? (
              <CloudOff className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className={`h-3.5 w-3.5 ${sync === "syncing" ? "animate-spin" : ""}`} />
            )}
            {label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
