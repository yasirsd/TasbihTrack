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
import { useAuth } from "@/components/auth/auth-context";
import { useData } from "@/components/data/data-context";
import { detectPhase1Data, type LocalDataSummary } from "@/lib/migration/phase1-local";
import { importLocalDataAction } from "@/lib/server/actions/migration-actions";
import { useToast } from "@/components/ui/toast";

export function ImportLocalDialog() {
  const { session, service } = useAuth();
  const { reload } = useData();
  const { toast } = useToast();
  const [summary, setSummary] = React.useState<LocalDataSummary | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const usernameNormalized = session?.user.username;
  const migrated = Boolean(
    (session?.user.preferences as { localMigrationCompletedAt?: string } | undefined)
      ?.localMigrationCompletedAt,
  );

  React.useEffect(() => {
    if (!usernameNormalized || migrated || dismissed) return;
    let cancelled = false;
    void detectPhase1Data(usernameNormalized).then((res) => {
      if (!cancelled) setSummary(res);
    });
    return () => {
      cancelled = true;
    };
  }, [usernameNormalized, migrated, dismissed]);

  if (!summary) return null;

  async function handleImport() {
    if (!summary) return;
    setBusy(true);
    try {
      const res = await importLocalDataAction(summary.payload);
      // refresh preferences so the flag sticks and we don't re-prompt
      await service.updatePreferences({});
      await reload();
      toast({
        title: "Local progress imported",
        description: `${res.trackers} goals · ${res.entries} entries`,
        tone: "success",
      });
      setSummary(null);
    } catch (e) {
      toast({
        title: "Couldn't import",
        description: (e as Error).message,
        tone: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && setDismissed(true)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Local progress found</DialogTitle>
          <DialogDescription>
            We found TasbihTrack progress stored on this device for the same username.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium">Ready to import</p>
          <p className="text-muted-foreground">
            {summary.trackerCount} goals · {summary.entryCount} entries
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Your local copy stays where it is until this succeeds.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
          <Button variant="crimson" onClick={handleImport} disabled={busy}>
            {busy ? "Importing…" : "Import to my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
