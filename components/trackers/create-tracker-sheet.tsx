"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { TasbihDatePicker } from "@/components/date/tasbih-date-picker";
import { todayKey } from "@/lib/date-utils";
import { formatIndianDigits, targetToWords } from "@/lib/number-words";
import { useEnsureFocusVisible } from "@/lib/keyboard/use-keyboard-viewport";

/**
 * Create Goal — Phase 5 P0 UX rescue.
 *
 * Every field now uses <FormField label="…"> so labels are always visible.
 * Placeholders are example-only ("e.g. Durood Shareef") and render in the
 * weak --placeholder token, so nobody can mistake the example for a real
 * value the way the previous field-with-placeholder-only design allowed.
 *
 * Keyboard-safe: a scoped useEnsureFocusVisible pulls the focused input
 * into the middle of the sheet's scroll region once the visual viewport
 * shrinks (i.e. when the mobile keyboard fully opens). No random 500ms
 * setTimeout, no per-form viewport listener — one shared hook.
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
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  useEnsureFocusVisible(scrollRootRef);

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
        <div ref={scrollRootRef}>
          <SheetHeader>
            <SheetTitle>New Goal</SheetTitle>
            <SheetDescription>Start a new Dhikr intention.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <FormField id="tname" label="Goal name">
              <Input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Durood Shareef"
                enterKeyHint="next"
                autoCapitalize="words"
                autoFocus
                disabled={submitting}
              />
            </FormField>

            <FormField
              id="ttarget"
              label="Target amount"
              hint={
                targetReadout ? (
                  <span className="text-sm text-foreground">{targetReadout.words}</span>
                ) : (
                  "Enter as digits — Indian-format grouping appears inside the field."
                )
              }
            >
              <Input
                id="ttarget"
                inputMode="numeric"
                pattern="[0-9,]*"
                enterKeyHint="next"
                // Display the Indian-formatted string so `100000` reads
                // as `1,00,000` inside the field. The underlying `target`
                // state stays pure digits so business logic is unaffected.
                value={formatIndianDigits(target)}
                onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 1,00,000"
                disabled={submitting}
              />
            </FormField>

            <FormField
              id="ttarget-date"
              label="Target date"
              optional
              hint="Powers pace, today's target, and estimated completion."
            >
              <TasbihDatePicker
                id="ttarget-date"
                value={targetDate}
                onChange={setTargetDate}
                minKey={todayKey()}
                placeholder="When would you like to complete this?"
                disabled={submitting}
                aria-label="Target date"
              />
            </FormField>

            <FormField id="tdesc" label="Description" optional>
              <Textarea
                id="tdesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Complete this over the next 3 months"
                disabled={submitting}
              />
            </FormField>

            <details className="group clay-list-row rounded-2xl border border-border/60 bg-muted/20 p-3">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span>Additional details</span>
                <span aria-hidden className="text-xs text-muted-foreground/70 transition-transform duration-200 group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <div className="mt-3 grid gap-3">
                <FormField id="tdaily" label="Custom daily target" optional>
                  <Input
                    id="tdaily"
                    inputMode="numeric"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Auto if left blank"
                    disabled={submitting}
                  />
                </FormField>
                <FormField
                  id="tstarting"
                  label="Already completed"
                  optional
                  hint="Recorded as your first entry so history stays honest."
                >
                  <Input
                    id="tstarting"
                    inputMode="numeric"
                    value={startingProgress}
                    onChange={(e) => setStartingProgress(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 23000"
                    disabled={submitting}
                  />
                </FormField>
                <FormField id="tarabic" label="Arabic text" optional>
                  <Input
                    id="tarabic"
                    lang="ar"
                    dir="rtl"
                    value={arabic}
                    onChange={(e) => setArabic(e.target.value)}
                    placeholder="اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ"
                    disabled={submitting}
                  />
                </FormField>
              </div>
            </details>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <PendingButton
              variant="crimson"
              size="xl"
              className="w-full"
              pending={submitting}
              pendingLabel="Creating goal…"
              onClick={submit}
            >
              Create Goal
            </PendingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
