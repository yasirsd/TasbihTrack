"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/ui/toast";

type Mode = "signIn" | "signUp";

export function AuthForm() {
  const { service } = useAuth();
  const [mode, setMode] = React.useState<Mode>("signIn");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [hasAccounts, setHasAccounts] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    void service.listAccounts().then((list) => {
      setHasAccounts(list.length > 0);
      if (list.length === 0) setMode("signUp");
    });
  }, [service]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signUp" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const result =
        mode === "signIn"
          ? await service.signIn(username, password)
          : await service.createAccount(username, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast({
        title: mode === "signIn" ? "Welcome back." : "Account created.",
        tone: "success",
      });
      router.push("/app/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md space-y-5"
    >
      <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 p-1 text-sm">
        <button
          type="button"
          className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
            mode === "signIn"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground"
          }`}
          onClick={() => setMode("signIn")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
            mode === "signUp"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground"
          }`}
          onClick={() => setMode("signUp")}
        >
          Create Account
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. yasir"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
        />
      </div>

      <AnimatePresence initial={false}>
        {mode === "signUp" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required={mode === "signUp"}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-2xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">
          {error}
        </div>
      )}

      <PendingButton
        type="submit"
        variant="crimson"
        size="lg"
        className="w-full"
        pending={submitting}
        pendingLabel={mode === "signIn" ? "Signing in…" : "Creating account…"}
      >
        {mode === "signIn" ? "Sign In" : "Create Account"}
      </PendingButton>

      <p className="text-center text-xs text-muted-foreground">
        {hasAccounts
          ? "Your data lives on this device until we launch cloud sync."
          : "First run — your first account will be created here on this device."}
      </p>
    </motion.form>
  );
}
