"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Segmented } from "@/components/ui/segmented";
import { GenderControl } from "@/components/ui/gender-control";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import type { Gender } from "@/lib/data/types";

type Mode = "signIn" | "signUp";

/**
 * Auth surface — Phase 7.2 P0.1 premium rebuild.
 *
 * Layout hierarchy (top-to-bottom):
 *   1. `Segmented` tab-strip (SIGN IN / CREATE ACCOUNT) at `lg` size —
 *      52-px comfortable touch target, inset tray under Clay.
 *   2. Raised auth shell (`.clay-raised` under Clay, subtle bordered
 *      card in Standard) wrapping the active form. This is what makes
 *      the form feel physically connected to the page rather than
 *      floating without anchor.
 *   3. Distinct title/subtitle per mode.
 *   4. Persistent labels via `FormField`; placeholders as example only.
 *   5. Shared `GenderControl` — same primitive as Edit Profile so both
 *      surfaces are visually and behaviorally identical (P0.7).
 *   6. Primary CTA at size="xl" (56 px) — the dominant page action.
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
    <div className="w-full max-w-md space-y-4">
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

      <section
        className="clay-raised rounded-3xl border border-border/60 bg-card/95 p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] sm:p-6"
        aria-label={mode === "signIn" ? "Sign in form" : "Create account form"}
      >
        <div className="mb-5 text-center">
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
      </section>
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
        size="xl"
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
        <GenderControl value={gender} onChange={setGender} />
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
        size="xl"
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
