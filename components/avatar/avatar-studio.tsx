"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { avatarAssetUrl } from "@/lib/avatar/avatar-engine";
import {
  AVATAR_CHARACTER_BY_ID,
  KARIM,
  KULTHUM,
  humanLabelFor,
} from "@/lib/avatar/manifest";
import type { AvatarConfigV3, Gender } from "@/lib/data/types";

/**
 * 1011 Avatar Studio — Phase 6.2 expression-only.
 *
 *   • Character is fixed by the user's persisted gender:
 *       male   → Karim (male-karim-white)
 *       female → Kulthum (female-kulthum-white)
 *       neutral / null → this Studio does not open (Profile shows the
 *         BrandMark + a small hint pointing users to Edit Profile).
 *   • Users personalise their EXPRESSION only.
 *   • The opposite character is never loaded, never referenced.
 *   • Draft stays local until Save; Save preserves on failure.
 *
 * The dapvatar npm package is gone as of Phase 6.2 — this file consumes
 * the tiny committed manifest in lib/avatar/manifest.ts.
 */

interface AvatarStudioProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Initial config to seed the draft from. Nullable — falls back to gender default. */
  initialConfig: AvatarConfigV3 | null;
  /** User's gender — determines which character's expression grid is shown. */
  gender: Gender | null;
}

export function AvatarStudio({
  open,
  onOpenChange,
  initialConfig,
  gender,
}: AvatarStudioProps) {
  const { service } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Character is derived from gender — this Studio isn't rendered at all
  // for neutral profiles (Profile hides the "Customize Avatar" button in
  // that case), but guard anyway.
  const character =
    gender === "male" ? KARIM : gender === "female" ? KULTHUM : null;

  const initialDraft = React.useMemo<AvatarConfigV3 | null>(() => {
    if (!character) return null;
    // Preserve a saved v3 posture that belongs to the correct character.
    if (
      initialConfig &&
      AVATAR_CHARACTER_BY_ID[initialConfig.characterId] === character
    ) {
      return initialConfig;
    }
    // Otherwise start from that character's default.
    return {
      version: 3,
      engine: "dapvatar",
      characterId: character.id,
      postureId: character.defaultPostureId,
    };
  }, [initialConfig, character]);

  const [draft, setDraft] = React.useState<AvatarConfigV3 | null>(initialDraft);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;
    setDraft(initialDraft);
    setError(null);
    setSubmitting(false);
  }, [open, initialDraft]);

  function pickPosture(key: string) {
    if (!character) return;
    const posture = character.expressions.find((e) => e.key === key);
    if (!posture) return;
    setDraft({
      version: 3,
      engine: "dapvatar",
      characterId: character.id,
      postureId: posture.postureId,
    });
  }

  async function save() {
    if (!draft || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await service.updateProfile({ avatarConfig: draft });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({ title: "Avatar saved", tone: "success" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const currentKey = draft
    ? draft.postureId.replace(/^.+-\d+-/, "")
    : character?.defaultExpression ?? "happy";
  const currentLabel = humanLabelFor(currentKey);

  return (
    <Sheet open={open} onOpenChange={(v) => (!submitting || v) && onOpenChange(v)}>
      <SheetContent>
        <div>
          <SheetHeader>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Avatar Studio
            </p>
            <SheetTitle>Your 1011 Avatar</SheetTitle>
            <SheetDescription>
              {character
                ? "Pick your expression. Save when you're happy with it."
                : "Choose Male or Female in Edit Profile to use a 1011 Avatar."}
            </SheetDescription>
          </SheetHeader>

          {character && (
            <>
              {/* PREVIEW */}
              <div className="mb-5 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "clay-card relative flex items-center justify-center rounded-[36px] border border-border/60 bg-card",
                    "h-[220px] w-[220px] p-3",
                  )}
                  style={{
                    background:
                      "radial-gradient(circle at 30% 20%, hsl(var(--brand-1)/0.14), transparent 55%), hsl(var(--card))",
                  }}
                >
                  <UserAvatar
                    config={draft}
                    size={180}
                    alt="Selected avatar"
                    loading="eager"
                  />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold tracking-tight">
                    {character.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{currentLabel}</p>
                </div>
              </div>

              {/* EXPRESSION PICKER — the only radiogroup in Studio now */}
              <section className="mb-6 space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Choose your expression
                </p>
                <ExpressionRadioGrid
                  character={character}
                  selectedKey={currentKey}
                  onSelect={pickPosture}
                />
              </section>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <PendingButton
                  variant="crimson"
                  pending={submitting}
                  pendingLabel="Saving…"
                  onClick={save}
                  disabled={!draft}
                  className="flex-1"
                >
                  Save Avatar
                </PendingButton>
              </div>
            </>
          )}

          {!character && (
            <div className="mt-4 flex flex-col gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Roving-tabindex radiogroup for the single character's expressions
// ---------------------------------------------------------------------------

function ExpressionRadioGrid({
  character,
  selectedKey,
  onSelect,
}: {
  character: typeof KARIM | typeof KULTHUM;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const items = character.expressions;
  const groupRef = React.useRef<HTMLDivElement>(null);
  const selectedIndex = React.useMemo(() => {
    const i = items.findIndex((it) => it.key === selectedKey);
    return i >= 0 ? i : 0;
  }, [items, selectedKey]);

  function focusIndex(i: number) {
    const btns = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[role='radio']",
    );
    btns?.[i]?.focus();
  }
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0) return;
    const cur = selectedIndex;
    let next = -1;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (cur + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (cur - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onSelect(items[next].key);
    requestAnimationFrame(() => focusIndex(next));
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Expression"
      onKeyDown={handleKey}
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {items.map((it, i) => {
        const selected = it.key === selectedKey;
        const isTabTarget = i === selectedIndex;
        const url = avatarAssetUrl(character.id, it.postureNumber, it.key);
        return (
          <button
            key={it.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={it.label}
            tabIndex={isTabTarget ? 0 : -1}
            onClick={() => onSelect(it.key)}
            className={cn(
              "clay-btn group relative flex flex-col items-center overflow-hidden rounded-2xl border p-1.5 text-left transition-[transform,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
              selected
                ? "border-foreground/60 shadow-[0_10px_30px_-12px_hsl(var(--brand-1)/0.4)]"
                : "border-border/60 hover:border-foreground/30",
            )}
          >
            {url && (
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                width={80}
                height={80}
                className="pointer-events-none h-[70px] w-[70px] select-none object-contain sm:h-20 sm:w-20"
              />
            )}
            <span
              className={cn(
                "mt-1 line-clamp-1 w-full text-center text-[11px]",
                selected ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {it.label}
            </span>
            {selected && (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm ring-2 ring-background"
              >
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
