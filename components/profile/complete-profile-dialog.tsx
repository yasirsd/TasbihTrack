"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { useMigration } from "@/components/migration/migration-context";
import type { Gender } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Legacy-user profile-completion dialog.
 *
 * State model matches the migration dialog fix (Prompt 4C.1B): separate
 * "there is data to collect" from "the modal is open". A per-user
 * sessionStorage flag persists the dismissal so DataContext churn cannot
 * reopen it, and a preference flag persists across sessions to avoid
 * nagging returning legacy users on every visit.
 */
const DISMISS_KEY = (userId: string) => `1011:profile-completion-dismissed:${userId}`;

export function CompleteProfileDialog() {
  const { session, service } = useAuth();
  const { toast } = useToast();
  // Modal priority (§77): if the migration dialog is currently visible,
  // wait its turn so we never stack two auto-prompts on top of each other.
  const migration = useMigration();
  const user = session?.user;
  const profile = user?.profile;

  const needsCompletion = Boolean(
    user &&
      !user.preferences?.profileCompletionDismissedAt &&
      (!profile?.firstName || !profile?.gender),
  );

  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [gender, setGender] = React.useState<Gender | "">("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return setOpen(false);
    if (!needsCompletion) return setOpen(false);
    // Yield to a higher-priority auto-prompt (migration).
    if (migration.open) {
      setOpen(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY(user.id)) === "1") return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [user, needsCompletion, migration.open]);

  React.useEffect(() => {
    if (open && profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setGender((profile.gender ?? "") as Gender | "");
    }
  }, [open, profile]);

  function dismissForSession(rememberAcrossSessions: boolean) {
    setOpen(false);
    if (user) {
      try {
        sessionStorage.setItem(DISMISS_KEY(user.id), "1");
      } catch {
        /* ignore */
      }
      if (rememberAcrossSessions) {
        void service.updatePreferences({
          profileCompletionDismissedAt: new Date().toISOString(),
        });
      }
    }
  }

  async function save() {
    if (submitting) return;
    setError(null);
    if (!firstName.trim()) return setError("First name is required.");
    if (!gender) return setError("Please choose an option.");
    setSubmitting(true);
    try {
      const result = await service.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender as Gender,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({ title: "Profile updated", tone: "success" });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismissForSession(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Just a couple of details so we can greet you properly and create your
            Tasbih avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField id="cp-first" label="First name">
              <Input
                id="cp-first"
                autoComplete="given-name"
                autoCapitalize="words"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Yasir"
                disabled={submitting}
              />
            </FormField>
            <FormField id="cp-last" label="Last name" optional>
              <Input
                id="cp-last"
                autoComplete="family-name"
                autoCapitalize="words"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Ahmed"
                disabled={submitting}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {(
                [
                  ["male", "Male"],
                  ["female", "Female"],
                  ["prefer_not_to_say", "Prefer not to say"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  role="radio"
                  aria-checked={gender === value}
                  onClick={() => setGender(value)}
                  disabled={submitting}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    gender === value
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => dismissForSession(true)}>
            Not now
          </Button>
          <PendingButton
            variant="crimson"
            pending={submitting}
            pendingLabel="Saving…"
            onClick={save}
          >
            Save
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
