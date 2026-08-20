"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { GenderControl } from "@/components/ui/gender-control";
import { useEnsureFocusVisible } from "@/lib/keyboard/use-keyboard-viewport";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/avatar/user-avatar";
import type { AvatarConfig, Gender } from "@/lib/data/types";

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: {
    firstName: string;
    lastName: string;
    gender: Gender;
    avatarConfig: AvatarConfig | null;
  };
}

/**
 * Phase 6.1 — Edit Profile handles ONLY name + gender.
 *
 * The old avatar customization UI (SVG presets, skin tones, backgrounds,
 * outfit tones) has been removed alongside the rest of the pre-Phase-6
 * avatar system. Avatar customization now lives exclusively in
 * "Customize Avatar" → 1011 Avatar Studio (see PROMPT 6.1 §"Remove old
 * avatar editing from Profile").
 *
 * A user's saved v3 Dapvatar config is preserved unchanged when they
 * save name/gender edits here. If the user's config predates Phase 6.1
 * (v1/v2 legacy), the server-side migration and validation layers will
 * have already replaced it — this sheet only ever sees v3 or null.
 */
export function EditProfileSheet({ open, onOpenChange, initial }: EditProfileSheetProps) {
  const { service } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = React.useState(initial.firstName);
  const [lastName, setLastName] = React.useState(initial.lastName);
  const [gender, setGender] = React.useState<Gender>(initial.gender);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  useEnsureFocusVisible(scrollRootRef);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setGender(initial.gender);
    setError(null);
    setSubmitting(false);
  }, [open, initial]);

  async function save() {
    if (submitting) return;
    setError(null);
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSubmitting(true);
    try {
      // Deliberately do NOT include avatarConfig — the user's saved
      // v3 Dapvatar avatar is left untouched. Avatar Studio is the
      // sole entry point for avatar changes.
      const result = await service.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({ title: "Profile updated", tone: "success" });
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
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Your name and how we address you. Your username stays the same.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <UserAvatar
                config={initial.avatarConfig}
                size={104}
                alt=""
                ariaHidden
                loading="eager"
                className="rounded-full ring-2 ring-border/60 ring-offset-2 ring-offset-background"
              />
              <p className="clay-inset-well max-w-xs rounded-2xl border border-border/50 bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
                To change your avatar, use <strong>Customize Avatar</strong> in Profile.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField id="ep-first" label="First name">
                <Input
                  id="ep-first"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Yasir"
                  disabled={submitting}
                />
              </FormField>
              <FormField id="ep-last" label="Last name" optional>
                <Input
                  id="ep-last"
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
              <p className="text-sm font-medium">Gender</p>
              <GenderControl
                value={gender}
                onChange={setGender}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Changing gender does not change your saved avatar.
              </p>
            </div>

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
              pendingLabel="Saving…"
              onClick={save}
            >
              Save profile
            </PendingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
