"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { todayKey, formatLongDate, toLocalDateKey } from "@/lib/date-utils";
import { formatNumber } from "@/lib/format";
import { smartQuickAmounts } from "@/lib/calculations/pace";
import type { Tracker } from "@/lib/data/types";

/**
 * P0 bug it fixes:
 *
 * The previous reset effect was `useEffect(() => { if (open) reset(); }, [open,
 * initialTrackerId, active])`. `active` is derived from `trackers`, which gets
 * a fresh reference on every background sync from DataProvider. That meant any
 * `reload()` — from focus, `online`, mutation reconciliation, queue flush, or
 * even React 19 StrictMode double-invoke — re-ran the reset while the sheet
 * was still open, wiping the amount the user was typing.
 *
 * The fix is to make draft state a pure local session: reset only on the
 * false → true transition of `open`, and read latest `initialTrackerId` /
 * `active` from refs so the effect can honestly depend on `open` alone.
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

  // Refs let the reset effect read the *latest* initialTrackerId and active
  // list at the moment of open without adding them to the dep array.
  const initialTrackerIdRef = React.useRef(initialTrackerId);
  const activeRef = React.useRef(active);
  initialTrackerIdRef.current = initialTrackerId;
  activeRef.current = active;

  // Reset the draft only when the sheet transitions closed → open.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    // Just opened — start a fresh session.
    setAmount("");
    setNote("");
    setDateKey(todayKey());
    setTrackerId(initialTrackerIdRef.current ?? activeRef.current[0]?.id);
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
    // Snapshot current draft so a mid-flight data refresh cannot affect us.
    const draft = { amount: numeric, entryDate: dateKey, note: note.trim() || undefined };
    // Optimistic close: the entry is already applied optimistically inside
    // addEntry; we don't need to block on the network round trip.
    onOpenChange(false);
    try {
      const entry = await addEntry({
        trackerId: selected.id,
        amount: draft.amount,
        entryDate: draft.entryDate,
        note: draft.note,
      });
      toast({
        title: "Progress added",
        description: `+${formatNumber(draft.amount)} to ${selected.name}`,
        tone: "success",
        action: {
          label: "Undo",
          onClick: () => {
            void deleteEntry(entry.id);
          },
        },
      });
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, tone: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(e) => {
          // Focus the amount field directly instead of Radix's default first-
          // focusable, without racing a setTimeout.
          e.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader>
          <SheetTitle>
            {selected ? `Add to ${selected.name}` : "Add progress"}
          </SheetTitle>
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
          />
        )}

        <div className="space-y-4">
          <div>
            <Input
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="h-20 rounded-3xl text-center text-5xl font-semibold tabular-nums"
              aria-label="Amount"
            />
            <QuickAmountRow
              amounts={quickAmounts}
              onAdd={(q) => setAmount((prev) => String((Number(prev) || 0) + q))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={dateKey}
              max={todayKey()}
              onChange={(e) =>
                setDateKey(
                  e.target.value
                    ? toLocalDateKey(new Date(e.target.value + "T00:00"))
                    : todayKey(),
                )
              }
            />
            <p className="text-xs text-muted-foreground">{formatLongDate(dateKey)}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. after Fajr"
              rows={2}
            />
          </div>

          <Button
            variant="crimson"
            size="lg"
            className="w-full"
            disabled={submitting || !selected || numeric <= 0}
            onClick={submit}
          >
            {numeric > 0 ? `Add ${formatNumber(numeric)}` : "Add progress"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TrackerPicker = React.memo(function TrackerPicker({
  active,
  trackerId,
  onSelect,
}: {
  active: Tracker[];
  trackerId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <Label className="mb-2 block">Goal</Label>
      <div className="flex flex-wrap gap-2">
        {active.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
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
}: {
  amounts: number[];
  onAdd: (n: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {amounts.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onAdd(q)}
          className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          +{formatNumber(q)}
        </button>
      ))}
    </div>
  );
});

