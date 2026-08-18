"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";

export function CreateTrackerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { createTracker } = useData();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [dailyTarget, setDailyTarget] = React.useState("");
  const [arabic, setArabic] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startingProgress, setStartingProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setTarget("");
      setDailyTarget("");
      setArabic("");
      setDescription("");
      setDate("");
      setStartingProgress("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setError(null);
    const trimmed = name.trim();
    const t = Number(target);
    if (!trimmed) return setError("Please give this goal a name.");
    if (!Number.isFinite(t) || t <= 0) return setError("Target must be greater than zero.");
    const dt = dailyTarget ? Number(dailyTarget) : undefined;
    const sp = startingProgress ? Number(startingProgress) : undefined;
    if (dt !== undefined && dt > t) {
      return setError("Daily target can't exceed the overall target.");
    }
    if (sp !== undefined && sp > t) {
      return setError("Already completed can't be more than the target.");
    }
    if (date) {
      const chosen = new Date(date + "T00:00").getTime();
      if (Number.isFinite(chosen) && chosen < new Date(new Date().toDateString()).getTime()) {
        return setError("Target date can't be in the past.");
      }
    }
    setSubmitting(true);
    try {
      await createTracker({
        name: trimmed,
        targetCount: t,
        dailyTarget: dt && dt > 0 ? dt : undefined,
        startingProgress: sp && sp > 0 ? sp : undefined,
        arabicText: arabic.trim() || undefined,
        description: description.trim() || undefined,
        targetDate: date || undefined,
      });
      toast({ title: "Goal created", tone: "success" });
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Goal</SheetTitle>
          <SheetDescription>Start a new Dhikr intention.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="tname">Name</Label>
            <Input
              id="tname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Durood Shareef"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ttarget">Target</Label>
            <Input
              id="ttarget"
              inputMode="numeric"
              pattern="[0-9]*"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="100000"
            />
          </div>
          <details className="group rounded-2xl border border-border/60 bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              More details (optional)
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tdaily">Daily target</Label>
                <Input
                  id="tdaily"
                  inputMode="numeric"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 2000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tstarting">Already completed</Label>
                <Input
                  id="tstarting"
                  inputMode="numeric"
                  value={startingProgress}
                  onChange={(e) => setStartingProgress(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 23000"
                />
                <p className="text-xs text-muted-foreground">
                  Recorded as your first entry so history stays honest.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tarabic">Arabic text</Label>
                <Input
                  id="tarabic"
                  dir="rtl"
                  value={arabic}
                  onChange={(e) => setArabic(e.target.value)}
                  placeholder="اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tdesc">Description</Label>
                <Textarea
                  id="tdesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tdate">Target date</Label>
                <Input
                  id="tdate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </details>

          {error && (
            <div className="rounded-2xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">
              {error}
            </div>
          )}
          <Button variant="crimson" size="lg" className="w-full" onClick={submit} disabled={submitting}>
            Create Goal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
