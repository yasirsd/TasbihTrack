"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { TasbihDatePicker } from "@/components/date/tasbih-date-picker";
import { todayKey } from "@/lib/date-utils";

/**
 * Target Date is a PRIMARY field (4C addendum §22): it powers pace, Today's
 * Target, ahead/behind, and estimated completion. Order: name → target →
 * target date. Truly optional fields (Arabic, description, custom daily
 * target, starting progress) live in the collapsed "Optional details".
 *
 * A stable client UUID is generated once per sheet-open cycle so a rapid
 * double-tap on Create Goal cannot create two trackers server-side.
 */
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
  const [targetDate, setTargetDate] = React.useState<string | undefined>(undefined);
  const [dailyTarget, setDailyTarget] = React.useState("");
  const [arabic, setArabic] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startingProgress, setStartingProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const clientIdRef = React.useRef<string | null>(null);

  // Reset draft + rotate a fresh client UUID whenever the sheet opens.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setName("");
    setTarget("");
    setTargetDate(undefined);
    setDailyTarget("");
    setArabic("");
    setDescription("");
    setStartingProgress("");
    setError(null);
    setSubmitting(false);
    clientIdRef.current = newUuid();
  }, [open]);

  async function submit() {
    setError(null);
    const trimmed = name.trim();
    const t = Number(target);
    if (!trimmed) return setError("Please give this goal a name.");
    if (!Number.isFinite(t) || t <= 0) return setError("Target must be greater than zero.");
    const dt = dailyTarget ? Number(dailyTarget) : undefined;
    const sp = startingProgress ? Number(startingProgress) : undefined;
    if (dt !== undefined && dt > t)
      return setError("Daily target can't exceed the overall target.");
    if (sp !== undefined && sp > t)
      return setError("Already completed can't be more than the target.");
    // Target date, when set, must not be in the past.
    if (targetDate && targetDate < todayKey())
      return setError("Target date can't be in the past.");

    setSubmitting(true);
    // Keep the stable client id across retries within this submission cycle —
    // server ON CONFLICT (id) DO NOTHING guarantees exactly one row.
    const clientId = clientIdRef.current ?? newUuid();
    clientIdRef.current = clientId;
    try {
      await createTracker({
        clientId,
        name: trimmed,
        targetCount: t,
        dailyTarget: dt && dt > 0 ? dt : undefined,
        startingProgress: sp && sp > 0 ? sp : undefined,
        arabicText: arabic.trim() || undefined,
        description: description.trim() || undefined,
        targetDate: targetDate || undefined,
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
    <Sheet open={open} onOpenChange={(v) => (!submitting || v) && onOpenChange(v)}>
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
              disabled={submitting}
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
              disabled={submitting}
            />
          </div>

          {/* Target Date — PRIMARY, not hidden. */}
          <div className="grid gap-2">
            <Label htmlFor="ttarget-date">
              Target date
              <span className="ml-1 font-normal text-muted-foreground">(recommended)</span>
            </Label>
            <TasbihDatePicker
              id="ttarget-date"
              value={targetDate}
              onChange={setTargetDate}
              minKey={todayKey()}
              placeholder="When would you like to complete this?"
              disabled={submitting}
              aria-label="Target date"
            />
            <p className="text-xs text-muted-foreground">
              Powers pace, today&apos;s target, and estimated completion. You can set it later.
            </p>
          </div>

          <details className="group rounded-2xl border border-border/60 bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Optional details
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tdaily">Custom daily target</Label>
                <Input
                  id="tdaily"
                  inputMode="numeric"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Auto if left blank"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to derive from your target date.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tstarting">Already completed</Label>
                <Input
                  id="tstarting"
                  inputMode="numeric"
                  value={startingProgress}
                  onChange={(e) => setStartingProgress(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 23000"
                  disabled={submitting}
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
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tdesc">Description</Label>
                <Textarea
                  id="tdesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </details>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson"
            >
              {error}
            </div>
          )}
          <PendingButton
            variant="crimson"
            size="lg"
            className="w-full"
            pending={submitting}
            pendingLabel="Creating goal…"
            onClick={submit}
          >
            Create Goal
          </PendingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
