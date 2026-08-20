"use client";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4"
        >
          <div className="clay-pill flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — changes are saved on this device.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
