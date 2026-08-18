"use client";
import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { formatNumber } from "@/lib/format";
import { formatLongDate } from "@/lib/date-utils";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";

export function EntryItem({
  entry,
  tracker,
}: {
  entry: ProgressEntry;
  tracker?: Tracker;
}) {
  const [open, setOpen] = React.useState(false);
  const created = new Date(entry.createdAt);
  const time = created.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-transparent px-3 py-2.5 text-left hover:border-border/50 hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          {tracker && <p className="truncate text-sm font-medium text-foreground">{tracker.name}</p>}
          <p className="text-xs text-muted-foreground">
            {time}
            {entry.note && ` · ${entry.note}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums text-foreground">
            +{formatNumber(entry.amount)}
          </p>
        </div>
      </motion.button>
      <EditEntrySheet
        entry={entry}
        open={open}
        onOpenChange={setOpen}
        trackerName={tracker?.name}
      />
    </>
  );
}

function EditEntrySheet({
  entry,
  open,
  onOpenChange,
  trackerName,
}: {
  entry: ProgressEntry;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trackerName?: string;
}) {
  const { updateEntry, deleteEntry } = useData();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(String(entry.amount));
  const [date, setDate] = React.useState(entry.entryDate);
  const [note, setNote] = React.useState(entry.note ?? "");

  React.useEffect(() => {
    if (open) {
      setAmount(String(entry.amount));
      setDate(entry.entryDate);
      setNote(entry.note ?? "");
    }
  }, [open, entry]);

  async function save() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    await updateEntry(entry.id, { amount: n, entryDate: date, note: note.trim() || null });
    toast({ title: "Changes saved", tone: "success" });
    onOpenChange(false);
  }

  async function remove() {
    if (!confirm("Delete this entry?")) return;
    await deleteEntry(entry.id);
    toast({ title: "Entry deleted" });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit entry</SheetTitle>
          {trackerName && <p className="text-sm text-muted-foreground">{trackerName}</p>}
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="ea">Amount</Label>
            <Input
              id="ea"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              className="text-2xl font-semibold tabular-nums"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ed">Date</Label>
            <Input id="ed" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">{formatLongDate(date)}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="en">Note</Label>
            <Textarea id="en" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="crimson" onClick={save} className="flex-1">
              <Pencil className="h-4 w-4" /> Save
            </Button>
            <Button variant="outline" onClick={remove} className="text-crimson">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
