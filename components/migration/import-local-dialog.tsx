"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { useAuth } from "@/components/auth/auth-context";
import { useData } from "@/components/data/data-context";
import { useMigration } from "@/components/migration/migration-context";
import { importLocalDataAction } from "@/lib/server/actions/migration-actions";
import { useToast } from "@/components/ui/toast";

export function ImportLocalDialog() {
  const { service } = useAuth();
  const { reload } = useData();
  const { toast } = useToast();
  const { candidate, open, closeDialog, markImported } = useMigration();
  const [busy, setBusy] = React.useState(false);

  async function handleImport() {
    if (!candidate || busy) return;
    setBusy(true);
    try {
      const res = await importLocalDataAction(candidate.payload);
      if (!res.success) {
        toast({
          title:
            res.code === "already_migrated"
              ? "Already imported"
              : "Couldn't import",
          description: res.message,
          tone: res.code === "already_migrated" ? "default" : "destructive",
        });
        if (res.code === "already_migrated") {
          // Refresh session preferences so the flag flips in the client too.
          await service.updatePreferences({}).catch(() => undefined);
          markImported();
        }
        return;
      }
      // Success: pull fresh session preferences (so `migrated` becomes true)
      // and refresh cloud snapshot ONCE.
      await service.updatePreferences({}).catch(() => undefined);
      await reload({ force: true });
      const goals = res.trackers === 1 ? "1 goal" : `${res.trackers} goals`;
      const entries = res.entries === 1 ? "1 entry" : `${res.entries} entries`;
      toast({
        title: "Local progress imported",
        description: `${goals} · ${entries}`,
        tone: "success",
      });
      markImported();
    } catch (err) {
      // The action itself doesn't throw for user-visible failures, but keep
      // a safety net for genuine network drops.
      toast({
        title: "Couldn't import",
        description:
          (err as Error)?.message?.includes("Failed to fetch") ||
          !navigator.onLine
            ? "You're offline. Try again once you're back online."
            : "Something went wrong. Nothing was changed.",
        tone: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  // Only mount the Dialog when both `open` and a `candidate` exist; but the
  // Dialog's own `open` is bound to state so dismissing genuinely closes it.
  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Local progress found</DialogTitle>
          <DialogDescription>
            We found earlier progress stored on this device for the same username.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium">Ready to import</p>
          <p className="text-muted-foreground">
            {candidate.trackerCount === 1 ? "1 goal" : `${candidate.trackerCount} goals`}
            {" · "}
            {candidate.entryCount === 1 ? "1 entry" : `${candidate.entryCount} entries`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Your local copy stays where it is until this succeeds.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeDialog} disabled={busy}>
            Not now
          </Button>
          <PendingButton
            variant="crimson"
            pending={busy}
            pendingLabel="Importing…"
            onClick={handleImport}
          >
            Import to my account
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
