"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Segmented } from "@/components/ui/segmented";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import type { Gender } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Mode = "signIn" | "signUp";

/**
 * Auth surface — post-Phase-5 P0 rescue (PROMPT 5A §1–§7).
 *
 * The active mode is signalled two ways that agree with each other:
 *   1. A prominent segmented control at the top: SIGN IN / CREATE ACCOUNT.
 *      Selected option gets a raised background (Clay lifts it out of the
 *      inset tray via .clay-segmented).
 *   2. A distinct title/subtitle per mode (never the same copy).
 *
 * Every field uses <FormField label="…"> so labels ALWAYS stay visible.
 * Placeholders are example text only ("e.g. yasir") and render in the
 * weak --placeholder token so users cannot mistake them for a real value.
 *
 * No AnimatePresence swap: we keep both trees under the segmented control
 * and simply show/hide, so switching modes is instantaneous. Removing the
 * mode-switch animation is intentional — it was one of the "everything
 * feels slow" contributors on real devices.
 */
export function AuthForm({
  onModeChange,
}: {
  onModeChange?: (mode: Mode) => void;
}) {
  const { service } = useAuth();
  const [mode, setModeState] = React.useState<Mode>("signIn");
  const setMode = React.useCallback(
    (m: Mode) => {
      setModeState(m);
      onModeChange?.(m);
    },
    [onModeChange],
  );
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="w-full max-w-md space-y-5">
      <Segmented<Mode>
        ariaLabel="Sign in or create account"
        value={mode}
        onChange={setMode}
        size="lg"
        options={[
          { value: "signIn", label: "Sign in" },
          { value: "signUp", label: "Create account" },
        ]}
      />

      <div className="text-center">
        {mode === "signIn" ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue your journey.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Begin your 1011 journey.
            </p>
          </>
        )}
      </div>

      {mode === "signIn" ? (
        <SignInForm service={service} toast={toast} router={router} />
      ) : (
        <SignUpForm service={service} toast={toast} router={router} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign In
// ---------------------------------------------------------------------------

interface FormShared {
  service: ReturnType<typeof useAuth>["service"];
  toast: ReturnType<typeof useToast>["toast"];
  router: ReturnType<typeof useRouter>;
}

function SignInForm({ service, toast, router }: FormShared) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await service.signIn(username, password, rememberMe);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({ title: "Welcome back.", tone: "success" });
      router.push("/app/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" autoComplete="on">
      <FormField id="signin-username" label="Username">
        <Input
          id="signin-username"
          autoComplete="username"
          inputMode="text"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. yasir"
          required
        />
      </FormField>

      <FormField id="signin-password" label="Password">
        <PasswordField
          id="signin-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="Your password"
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
      </FormField>

      <label className="flex select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 accent-[hsl(var(--brand-1))]"
        />
        <span>Remember me on this device</span>
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <PendingButton
        type="submit"
        variant="crimson"
        size="lg"
        className="w-full"
        pending={submitting}
        pendingLabel="Signing in…"
      >
        Sign In
      </PendingButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign Up (registration)
// ---------------------------------------------------------------------------

function SignUpForm({ service, toast, router }: FormShared) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [gender, setGender] = React.useState<Gender | "">("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!gender) {
      setError("Please choose an option for gender.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await service.createAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender as Gender,
        username,
        password,
        rememberMe: true,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({ title: "Account created.", tone: "success" });
      router.push("/app/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" autoComplete="on">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="reg-first" label="First name">
          <Input
            id="reg-first"
            autoComplete="given-name"
            enterKeyHint="next"
            autoCapitalize="words"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Yasir"
            required
          />
        </FormField>
        <FormField id="reg-last" label="Last name" optional>
          <Input
            id="reg-last"
            autoComplete="family-name"
            enterKeyHint="next"
            autoCapitalize="words"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Ahmed"
          />
        </FormField>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Gender</p>
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
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-[background,color,transform] duration-150 touch-manipulation active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                gender === value
                  ? "border-foreground/20 bg-foreground text-background shadow-sm"
                  : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <FormField
        id="reg-username"
        label="Username"
        hint="Used to sign in. 3–20 lowercase letters, numbers, or underscore."
      >
        <Input
          id="reg-username"
          autoComplete="username"
          inputMode="text"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. yasir"
          required
        />
      </FormField>

      <FormField id="reg-password" label="Password" hint="At least 6 characters.">
        <PasswordField
          id="reg-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          enterKeyHint="go"
          placeholder="Choose a password"
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
      </FormField>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <PendingButton
        type="submit"
        variant="crimson"
        size="lg"
        className="w-full"
        pending={submitting}
        pendingLabel="Creating account…"
      >
        Create Account
      </PendingButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Password field with show/hide.
// Placeholder is used as example text ONLY, using the weak --placeholder token.
// ---------------------------------------------------------------------------

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  enterKeyHint,
  placeholder,
  show,
  onToggleShow,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  enterKeyHint?: "go" | "next" | "done";
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
