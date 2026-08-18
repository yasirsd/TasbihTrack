"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import type { Gender } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Mode = "signIn" | "signUp";

/**
 * Sign In is the default view (§19). Create Account is reached via a
 * secondary link at the bottom, not a tab. This mirrors what returning
 * users need — they type username + password, not a full registration form.
 */
export function AuthForm() {
  const { service } = useAuth();
  const [mode, setMode] = React.useState<Mode>("signIn");
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        {mode === "signIn" ? (
          <motion.div
            key="signIn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <SignInForm
              service={service}
              toast={toast}
              onCreateAccount={() => setMode("signUp")}
              router={router}
            />
          </motion.div>
        ) : (
          <motion.div
            key="signUp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <SignUpForm
              service={service}
              toast={toast}
              onSignIn={() => setMode("signIn")}
              router={router}
            />
          </motion.div>
        )}
      </AnimatePresence>
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

function SignInForm({
  service,
  toast,
  onCreateAccount,
  router,
}: FormShared & { onCreateAccount: () => void }) {
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
    <form onSubmit={submit} className="space-y-4">
      <div className="mb-1 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Sign in
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight">Welcome back</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-username">Username</Label>
        <Input
          id="signin-username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="yasir"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <PasswordField
          id="signin-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
      </div>

      <label className="flex select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 accent-crimson"
        />
        <span>Remember me on this device</span>
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson"
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

      <p className="pt-2 text-center text-sm text-muted-foreground">
        New to 1011 Tracker?{" "}
        <button
          type="button"
          onClick={onCreateAccount}
          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Create account
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign Up (registration)
// ---------------------------------------------------------------------------

function SignUpForm({
  service,
  toast,
  onSignIn,
  router,
}: FormShared & { onSignIn: () => void }) {
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
      <div className="mb-1 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Create account
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight">
          Start your journey
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="reg-first">First name</Label>
          <Input
            id="reg-first"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-last">Last name</Label>
          <Input
            id="reg-last"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
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
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
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

      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
        <Input
          id="reg-username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="yasir"
          required
        />
        <p className="text-xs text-muted-foreground">
          Used to sign in. 3–20 lowercase letters, numbers, or underscore.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <PasswordField
          id="reg-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
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
        type="submit"
        variant="crimson"
        size="lg"
        className="w-full"
        pending={submitting}
        pendingLabel="Creating account…"
      >
        Create Account
      </PendingButton>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSignIn}
          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Password field with show/hide (§34)
// ---------------------------------------------------------------------------

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  show,
  onToggleShow,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="At least 6 characters"
        required
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
