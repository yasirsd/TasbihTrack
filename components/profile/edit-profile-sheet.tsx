"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { TasbihAvatar } from "@/components/avatar/tasbih-avatar";
import {
  BACKGROUNDS,
  OUTFIT_TONES,
  SKIN_TONES,
  defaultAvatarFor,
  getPreset,
  presetsForGender,
  type BackgroundId,
  type OutfitToneId,
  type SkinToneId,
} from "@/lib/avatar/config";
import type { AvatarConfig, Gender } from "@/lib/data/types";
import { cn } from "@/lib/utils";

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
 * Profile editor. Preset-first per §50: users pick from the curated set for
 * their gender, then tune skin tone + background. Headwear stays locked to
 * the preset's original configuration (§47).
 *
 * Gender change behavior (§56): if the current avatar is a default for the
 * previous gender (untouched), we swap to the corresponding new default.
 * A customized avatar is preserved and only reset with an explicit action.
 */
export function EditProfileSheet({ open, onOpenChange, initial }: EditProfileSheetProps) {
  const { service } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = React.useState(initial.firstName);
  const [lastName, setLastName] = React.useState(initial.lastName);
  const [gender, setGender] = React.useState<Gender>(initial.gender);
  const [avatar, setAvatar] = React.useState<AvatarConfig>(() =>
    initial.avatarConfig ?? defaultAvatarFor(initial.gender),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset when the sheet opens fresh
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setGender(initial.gender);
    setAvatar(initial.avatarConfig ?? defaultAvatarFor(initial.gender));
    setError(null);
    setSubmitting(false);
  }, [open, initial]);

  const preset = getPreset(avatar.preset)!;
  const availablePresets = presetsForGender(gender);

  // If gender changes and the current preset doesn't belong to the new
  // gender, offer to migrate to that gender's first preset.
  React.useEffect(() => {
    if (preset.gender !== gender && availablePresets.length > 0) {
      setAvatar((prev) => ({
        ...defaultAvatarFor(gender),
        skinTone: prev.skinTone,
        background: prev.background,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  async function save() {
    if (submitting) return;
    setError(null);
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await service.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        avatarConfig: avatar,
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
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Your name and avatar. Your username stays the same.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="flex justify-center">
            <TasbihAvatar config={avatar} gender={gender} size={96} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ep-first">First name</Label>
              <Input
                id="ep-first"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-last">Last name</Label>
              <Input
                id="ep-last"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={submitting}
              />
            </div>
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

          <div className="space-y-2">
            <Label>Avatar preset</Label>
            <div className="grid grid-cols-3 gap-3">
              {availablePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setAvatar((prev) => ({
                      preset: p.id,
                      skinTone: prev.skinTone ?? p.defaultSkin,
                      background: prev.background ?? p.defaultBackground,
                      headwear: p.headwear,
                    }))
                  }
                  className={cn(
                    "rounded-2xl border p-2 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    avatar.preset === p.id
                      ? "border-foreground/40 bg-muted"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <TasbihAvatar
                    config={{
                      preset: p.id,
                      skinTone: p.defaultSkin,
                      background: p.defaultBackground,
                      headwear: p.headwear,
                    }}
                    size={56}
                    ariaHidden
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skin tone</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SKIN_TONES) as SkinToneId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar((prev) => ({ ...prev, skinTone: id }))}
                  aria-label={`Skin tone ${id}`}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-transform",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    avatar.skinTone === id
                      ? "scale-110 border-foreground/60"
                      : "border-border/60",
                  )}
                  style={{ backgroundColor: SKIN_TONES[id] }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BACKGROUNDS) as BackgroundId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar((prev) => ({ ...prev, background: id }))}
                  aria-label={`Background ${id}`}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-transform",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    avatar.background === id
                      ? "scale-110 border-foreground/60"
                      : "border-border/60",
                  )}
                  style={{ backgroundColor: BACKGROUNDS[id] }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outfit</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(OUTFIT_TONES) as OutfitToneId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar((prev) => ({ ...prev, outfitTone: id }))}
                  aria-label={`Outfit ${id}`}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-transform",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    avatar.outfitTone === id
                      ? "scale-110 border-foreground/60"
                      : "border-border/60",
                  )}
                  style={{ backgroundColor: OUTFIT_TONES[id] }}
                />
              ))}
            </div>
          </div>

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
            pendingLabel="Saving…"
            onClick={save}
          >
            Save profile
          </PendingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
