"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { DataProvider } from "@/components/data/data-context";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { SideRail } from "@/components/navigation/side-rail";
import { AddProgressSheet } from "@/components/progress/add-progress-sheet";
import { CreateTrackerSheet } from "@/components/trackers/create-tracker-sheet";
import { AddSheetContext, useAddSheet } from "@/components/navigation/add-sheet-context";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { ImportLocalDialog } from "@/components/migration/import-local-dialog";
import { MigrationProvider } from "@/components/migration/migration-context";
import { CelebrationProvider } from "@/components/celebration/celebration-context";
import { MilestoneCelebration } from "@/components/celebration/milestone-celebration";
import { SyncIndicator } from "@/components/pwa/sync-indicator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [initialTrackerId, setInitialTrackerId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") setAddOpen(true);
  }, [session]);

  if (loading || !session) {
    return (
      <div className="app-shell grid min-h-dvh place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-crimson" />
          Preparing your journey…
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
     <MigrationProvider>
      <CelebrationProvider>
      <AddSheetContext.Provider
        value={{
          openAdd: (id) => {
            setInitialTrackerId(id);
            setAddOpen(true);
          },
          openCreate: () => setCreateOpen(true),
        }}
      >
        <div className="app-shell">
          <SideRail onAdd={() => setAddOpen(true)} />
          <div className="lg:pl-72">
            <main className="mx-auto max-w-3xl px-5 pb-32 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] lg:px-8 lg:pb-16 lg:pt-8">
              {children}
            </main>
          </div>
          <BottomNav onAdd={() => setAddOpen(true)} />
          <OfflineIndicator />
          <SyncIndicator />
          <ImportLocalDialog />
          <AddProgressSheet
            open={addOpen}
            onOpenChange={setAddOpen}
            initialTrackerId={initialTrackerId}
          />
          <CreateTrackerSheet open={createOpen} onOpenChange={setCreateOpen} />
          <MilestoneCelebration />
        </div>
      </AddSheetContext.Provider>
      </CelebrationProvider>
     </MigrationProvider>
    </DataProvider>
  );
}
