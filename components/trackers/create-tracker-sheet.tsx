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
import { targetToWords } from "@/lib/number-words";

/**
 * Main-flow fields per 4C.2B §50:
 *   Goal name
 *   Target amount   ← with formatted commas + spelled-out words below
 *   Target date
 *   Description     ← promoted out of Additional Details
 *
 * Additional Details keeps only genuinely optional metadata.
 *
 * Draft state uses a stable client UUID minted once per open cycle (§80
 * idempotency) so rapid double-taps still produce exactly one goal.
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
  const [description, setDescription] = React.useState("");
  const [dailyTarget, setDailyTarget] = React.useState("");
  const [arabic, setArabic] = React.useState("");
  const [startingProgress, setStartingProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const clientIdRef = React.useRef<string | null>(null);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setName("");
    setTarget("");
    setTargetDate(undefined);
    setDescription("");
    setDailyTarget("");
    setArabic("");
    setStartingProgress("");
    setError(null);
    setSubmitting(false);
    clientIdRef.current = newUuid();
  }, [open]);

  const targetReadout = React.useMemo(() => targetToWords(target), [target]);

  async function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError("Please give this goal a name.");
    if (!targetReadout) return setError("Please enter a valid target amount.");
    const t = targetReadout.value;
    const dt = dailyTarget ? Number(dailyTarget) : undefined;
    const sp = startingProgress ? Number(startingProgress) : undefined;
    if (dt !== undefined && dt > t)
      return setError("Daily target can't exceed the overall target.");
    if (sp !== undefined && sp > t)
      return setError("Already completed can't be more than the target.");
    if (targetDate && targetDate < todayKey())
      return setError("Target date can't be in the past.");

    setSubmitting(true);
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
              enterKeyHint="next"
              autoCapitalize="words"
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
              enterKeyHint="next"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="100000"
              disabled={submitting}
            />
            {/* Readability aid (§54) — commas + spelled-out words below. The
                input itself stays raw digits so the caret never jumps. */}
            {targetReadout && (
              <div className="rounded-2xl border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                <p className="tabular-nums text-foreground">
                  {targetReadout.value.toLocaleString("en-US")}
                </p>
                <p className="text-xs text-muted-foreground">{targetReadout.words}</p>
              </div>
            )}
          </div>

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

          {/* Description promoted to the main flow (§50–§51) */}
          <div className="grid gap-2">
            <Label htmlFor="tdesc">Description</Label>
            <Textarea
              id="tdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are you setting this goal?"
              disabled={submitting}
            />
          </div>

          <details className="group rounded-2xl border border-border/60 bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Additional details
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
                  lang="ar"
                  dir="rtl"
                  value={arabic}
                  onChange={(e) => setArabic(e.target.value)}
                  placeholder="اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ"
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
