"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { TasbihDatePicker } from "@/components/date/tasbih-date-picker";
import { formatIndianDigits, targetToWords } from "@/lib/number-words";
import { useEnsureFocusVisible } from "@/lib/keyboard/use-keyboard-viewport";
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
  const [dailyTarget, setDailyTarget] = React.useState("");
  const [arabic, setArabic] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetDate, setTargetDate] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmTargetChange, setConfirmTargetChange] = React.useState(false);
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  useEnsureFocusVisible(scrollRootRef);

  React.useEffect(() => {
    if (!tracker) return;
    setName(tracker.name);
    setTarget(String(tracker.targetCount));
    setDailyTarget(tracker.dailyTarget ? String(tracker.dailyTarget) : "");
    setArabic(tracker.arabicText ?? "");
    setDescription(tracker.description ?? "");
    setTargetDate(tracker.targetDate ?? undefined);
    setConfirmTargetChange(false);
    setSubmitting(false);
  }, [tracker, open]);

  const targetChanged = tracker && Number(target) !== tracker.targetCount;
  const dailyChanged =
    tracker && Number(dailyTarget || 0) !== Number(tracker.dailyTarget ?? 0);
  const dateChanged = tracker && (targetDate ?? undefined) !== (tracker.targetDate ?? undefined);

  async function submit() {
    if (!tracker || submitting) return;
    const t = Number(target);
    if (!name.trim() || !Number.isFinite(t) || t <= 0) return;
    if (targetChanged && !confirmTargetChange) {
      setConfirmTargetChange(true);
      return;
    }
    setSubmitting(true);
    try {
      await updateTracker(tracker.id, {
        name,
        targetCount: t,
        dailyTarget: dailyChanged
          ? dailyTarget
            ? Number(dailyTarget)
            : null
          : undefined,
        arabicText: arabic || undefined,
        description: description || undefined,
        targetDate: dateChanged ? (targetDate ?? null) : undefined,
      });
      toast({ title: "Changes saved", tone: "success" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (!submitting || v) && onOpenChange(v)}>
      <SheetContent>
        <div ref={scrollRootRef}>
          <SheetHeader>
            <SheetTitle>Edit Goal</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <FormField id="ename" label="Goal name">
              <Input
                id="ename"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Durood Shareef"
                disabled={submitting}
              />
            </FormField>
            <FormField
              id="etarget"
              label="Target amount"
              hint={(() => {
                const r = targetToWords(target);
                return r ? (
                  <span className="text-sm text-foreground">{r.words}</span>
                ) : null;
              })()}
            >
              <Input
                id="etarget"
                inputMode="numeric"
                pattern="[0-9,]*"
                enterKeyHint="next"
                value={formatIndianDigits(target)}
                onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={submitting}
              />
            </FormField>
            <FormField id="edaily" label="Daily target" optional>
              <Input
                id="edaily"
                inputMode="numeric"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Auto if left blank"
                disabled={submitting}
              />
            </FormField>
            <FormField id="edate" label="Target date" optional>
              <TasbihDatePicker
                id="edate"
                value={targetDate}
                onChange={setTargetDate}
                placeholder="No target date"
                disabled={submitting}
                aria-label="Target date"
              />
            </FormField>
            <FormField id="earabic" label="Arabic text" optional>
              <Input
                id="earabic"
                lang="ar"
                dir="rtl"
                value={arabic}
                onChange={(e) => setArabic(e.target.value)}
                placeholder="اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ"
                disabled={submitting}
              />
            </FormField>
            <FormField id="edesc" label="Description" optional>
              <Textarea
                id="edesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Complete this over the next 3 months"
                disabled={submitting}
              />
            </FormField>

            {confirmTargetChange && targetChanged && tracker && (
              <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3 text-sm">
                Changing target from {tracker.targetCount.toLocaleString()} to{" "}
                {Number(target).toLocaleString()}. History and milestones are preserved in the
                Journey. Tap Save again to confirm.
              </div>
            )}

            <PendingButton
              variant="crimson"
              size="lg"
              className="w-full"
              pending={submitting}
              pendingLabel="Saving…"
              onClick={submit}
            >
              Save changes
            </PendingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
