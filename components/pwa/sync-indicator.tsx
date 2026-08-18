"use client";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useData } from "@/components/data/data-context";

export function SyncIndicator() {
  const { sync } = useData();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (sync === "syncing" || sync === "error") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), sync === "syncing" ? 1500 : 3000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [sync]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur">
            <RefreshCw className={`h-3.5 w-3.5 ${sync === "syncing" ? "animate-spin" : ""}`} />
            {sync === "syncing" ? "Syncing…" : "Couldn't sync."}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
