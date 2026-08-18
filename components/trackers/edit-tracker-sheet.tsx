"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import type { Tracker } from "@/lib/data/types";

export function EditTrackerSheet({
  tracker,
  open,
  onOpenChange,
}: {
  tracker: Tracker | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateTracker } = useData();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [arabic, setArabic] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!tracker) return;
    setName(tracker.name);
    setTarget(String(tracker.targetCount));
    setArabic(tracker.arabicText ?? "");
    setDescription(tracker.description ?? "");
    setDate(tracker.targetDate ?? "");
  }, [tracker, open]);

  async function submit() {
    if (!tracker) return;
    const t = Number(target);
    if (!name.trim() || !Number.isFinite(t) || t <= 0) return;
    setSubmitting(true);
    try {
      await updateTracker(tracker.id, {
        name,
        targetCount: t,
        arabicText: arabic || undefined,
        description: description || undefined,
        targetDate: date || null,
      });
      toast({ title: "Changes saved", tone: "success" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Goal</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="ename">Name</Label>
            <Input id="ename" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="etarget">Target</Label>
            <Input
              id="etarget"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="earabic">Arabic text</Label>
            <Input
              id="earabic"
              dir="rtl"
              value={arabic}
              onChange={(e) => setArabic(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edesc">Description</Label>
            <Textarea
              id="edesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edate">Target date</Label>
            <Input id="edate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="crimson" size="lg" className="w-full" onClick={submit} disabled={submitting}>
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
