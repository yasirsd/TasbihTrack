"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { todayKey } from "@/lib/date-utils";
import { formatNumber } from "@/lib/format";
import { smartQuickAmounts } from "@/lib/calculations/pace";
import { useCelebration, pickCelebration } from "@/components/celebration/celebration-context";
import { TasbihDatePicker } from "@/components/date/tasbih-date-picker";
import type { Tracker } from "@/lib/data/types";

/**
 * Draft state is a pure local session (Phase 4A regression test in place).
 * Adds pending state (disables submit + quick chips + date picker to prevent
 * duplicate-submits) and celebration triggering from the server's typed
 * `newMilestones` / `completed` response.
 */
export function AddProgressSheet({
  open,
  onOpenChange,
  initialTrackerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTrackerId?: string;
}) {
  const { trackers, entries, addEntry, deleteEntry } = useData();
  const { toast } = useToast();
  const { celebrate } = useCelebration();

  const active = React.useMemo(
    () => trackers.filter((t) => t.status === "active" || t.status === "completed"),
    [trackers],
  );

  const [amount, setAmount] = React.useState("");
  const [dateKey, setDateKey] = React.useState(() => todayKey());
  const [note, setNote] = React.useState("");
  const [trackerId, setTrackerId] = React.useState<string | undefined>(initialTrackerId);
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const initialTrackerIdRef = React.useRef(initialTrackerId);
  const activeRef = React.useRef(active);
  initialTrackerIdRef.current = initialTrackerId;
  activeRef.current = active;

  // ---------------------------------------------------------------------
  // Stable submission UUID (P0 idempotency)
  //
  // One UUID per open cycle. Every submit — and every retry after a failed
  // submit — reuses this ID. The server-side ON CONFLICT (id) DO NOTHING
  // guarantees exactly one logical entry even if the request is sent twice
  // or a first request reached Postgres but the response was lost.
  //
  // The ID rotates on the NEXT open cycle (fresh draft, fresh operation).
  // ---------------------------------------------------------------------
  const submissionIdRef = React.useRef<string | null>(null);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setAmount("");
    setNote("");
    setDateKey(todayKey());
    setTrackerId(initialTrackerIdRef.current ?? activeRef.current[0]?.id);
    setSubmitting(false);
    submissionIdRef.current = mintUuid();
  }, [open]);

  const selected = trackers.find((t) => t.id === trackerId);
  const numeric = Number(amount);
  const quickAmounts = React.useMemo(
    () =>
      smartQuickAmounts(selected ? entries.filter((e) => e.trackerId === selected.id) : []),
    [entries, selected],
  );

  async function submit() {
    if (!selected || !Number.isFinite(numeric) || numeric <= 0 || submitting) return;
    setSubmitting(true);
    // Snapshot: a mid-flight data refresh cannot affect these values.
    const draft = { amount: numeric, entryDate: dateKey, note: note.trim() || undefined };
    // Reuse the same UUID across retries so a retried request never creates
    // a duplicate row. Guaranteed to be non-null: we mint it on open.
    const submissionId = submissionIdRef.current ?? mintUuid();
    submissionIdRef.current = submissionId;
    try {
      const result = await addEntry({
        clientId: submissionId,
        trackerId: selected.id,
        amount: draft.amount,
        entryDate: draft.entryDate,
        note: draft.note,
      });
      onOpenChange(false);
      // Choose celebration (completion beats milestone; highest milestone wins).
      const celebration = pickCelebration(result.newMilestones, result.completed);
      if (celebration) {
        // Total after this entry is authoritative from the server row.
        const totalAfter = entries
          .filter((e) => e.trackerId === selected.id)
          .reduce((a, b) => a + b.amount, 0) + draft.amount;
        celebrate({ kind: celebration, tracker: selected, completed: totalAfter });
      } else {
        toast({
          title: "Progress added",
          description: `+${formatNumber(draft.amount)} to ${selected.name}`,
          tone: "success",
          action: {
            label: "Undo",
            onClick: () => {
              void deleteEntry(result.entry.id);
            },
          },
        });
      }
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, tone: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (!submitting || v) && onOpenChange(v)}>
      <SheetContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Add progress
          </p>
          <SheetTitle className="text-xl">{selected ? selected.name : "Add progress"}</SheetTitle>
          <SheetDescription>How much did you complete?</SheetDescription>
        </SheetHeader>

        {active.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            You don't have an active goal yet. Create one first, then add progress from your dashboard.
          </div>
        )}

        {active.length > 1 && (
          <TrackerPicker
            active={active}
            trackerId={trackerId}
            onSelect={setTrackerId}
            disabled={submitting}
          />
        )}

        <div className="space-y-5">
          <div>
            <Input
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="h-24 rounded-3xl text-center text-5xl font-semibold tabular-nums"
              aria-label="Amount"
              disabled={submitting}
            />
            <QuickAmountRow
              amounts={quickAmounts}
              onAdd={(q) => setAmount((prev) => String((Number(prev) || 0) + q))}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="entry-date">Date</Label>
            <TasbihDatePicker
              id="entry-date"
              value={dateKey}
              onChange={(v) => setDateKey(v ?? todayKey())}
              maxKey={todayKey()}
              allowClear={false}
              disabled={submitting}
              aria-label="Entry date"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. after Fajr"
              rows={2}
              disabled={submitting}
            />
          </div>

          <PendingButton
            variant="crimson"
            size="lg"
            className="w-full"
            pending={submitting}
            pendingLabel="Adding…"
            disabled={!selected || numeric <= 0}
            onClick={submit}
          >
            {numeric > 0 ? `Add ${formatNumber(numeric)}` : "Add progress"}
          </PendingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TrackerPicker = React.memo(function TrackerPicker({
  active,
  trackerId,
  onSelect,
  disabled,
}: {
  active: Tracker[];
  trackerId: string | undefined;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <Label className="mb-2 block">Goal</Label>
      <div className="flex flex-wrap gap-2">
        {active.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(t.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
              t.id === trackerId
                ? "border-foreground/30 bg-foreground text-background"
                : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
});

const QuickAmountRow = React.memo(function QuickAmountRow({
  amounts,
  onAdd,
  disabled,
}: {
  amounts: number[];
  onAdd: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {amounts.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onAdd(q)}
          className={[
            "h-9 min-w-[64px] rounded-full border border-border/60 bg-muted/40 px-3 text-sm font-medium text-foreground",
            "transition-colors hover:bg-muted active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:opacity-50",
          ].join(" ")}
        >
          +{formatNumber(q)}
        </button>
      ))}
    </div>
  );
});

function mintUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

