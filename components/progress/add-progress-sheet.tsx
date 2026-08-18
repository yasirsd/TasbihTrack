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
  const active = trackers.filter((t) => t.status === "active" || t.status === "completed");
  const [trackerId, setTrackerId] = React.useState<string | undefined>(
    initialTrackerId ?? active[0]?.id,
  );
  const [amount, setAmount] = React.useState<string>("");
  const [dateKey, setDateKey] = React.useState<string>(todayKey());
  const [note, setNote] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setDateKey(todayKey());
      setTrackerId(initialTrackerId ?? active[0]?.id);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialTrackerId, active]);

  const selected = trackers.find((t) => t.id === trackerId);
  const numeric = Number(amount);
  const quickAmounts = React.useMemo(
    () =>
      smartQuickAmounts(
        selected ? entries.filter((e) => e.trackerId === selected.id) : [],
      ),
    [entries, selected],
  );

  async function submit() {
    if (!selected || !Number.isFinite(numeric) || numeric <= 0) return;
    setSubmitting(true);
    try {
      const entry = await addEntry({
        trackerId: selected.id,
        amount: numeric,
        entryDate: dateKey,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
      toast({
        title: "Progress added",
        description: `+${formatNumber(numeric)} to ${selected.name}`,
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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {selected ? `Add to ${selected.name}` : "Add progress"}
          </SheetTitle>
          <SheetDescription>How much did you complete?</SheetDescription>
        </SheetHeader>

        {active.length > 1 && (
          <div className="mb-4">
            <Label className="mb-2 block">Goal</Label>
            <div className="flex flex-wrap gap-2">
              {active.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrackerId(t.id)}
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
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String((Number(amount) || 0) + q))}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  +{formatNumber(q)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={dateKey}
              max={todayKey()}
              onChange={(e) => setDateKey(e.target.value ? toLocalDateKey(new Date(e.target.value + "T00:00")) : todayKey())}
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
