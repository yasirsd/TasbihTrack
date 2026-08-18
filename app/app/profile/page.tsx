"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Download, LogOut, Moon, Repeat, Shield, Sun, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallButton } from "@/components/pwa/install-button";
import { useToast } from "@/components/ui/toast";
import { backupFilename, downloadJson, exportBackup, parseBackup, restoreBackup, summarizeBackup } from "@/lib/backup/backup";
import { useData } from "@/components/data/data-context";
import type { Backup } from "@/lib/backup/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const { session, service, refresh } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { reload } = useData();
  const { theme, setTheme } = useTheme();
  const [accounts, setAccounts] = React.useState<{ id: string; username: string; createdAt: string }[]>([]);
  const [showChangePw, setShowChangePw] = React.useState(false);
  const [showSwitch, setShowSwitch] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [pendingBackup, setPendingBackup] = React.useState<Backup | null>(null);
  const [persistent, setPersistent] = React.useState<boolean | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    void service.listAccounts().then(setAccounts);
    if (typeof navigator !== "undefined" && "storage" in navigator && "persisted" in navigator.storage) {
      void navigator.storage.persisted().then(setPersistent);
    }
  }, [service]);

  async function requestPersist() {
    if (!("storage" in navigator) || !("persist" in navigator.storage)) return;
    const ok = await navigator.storage.persist();
    setPersistent(ok);
    toast({ title: ok ? "Persistent storage enabled" : "Browser declined persistent storage" });
  }

  async function handleExport() {
    if (!session) return;
    const backup = await exportBackup(session.user.id);
    downloadJson(backupFilename(session.user.username), backup);
    toast({ title: "Backup exported", tone: "success" });
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const result = parseBackup(raw);
      if (!result.ok) {
        toast({ title: "Invalid backup", description: result.message, tone: "destructive" });
        return;
      }
      setPendingBackup(result.backup);
    } catch {
      toast({ title: "Couldn't read file", tone: "destructive" });
    }
  }

  async function confirmRestore() {
    if (!pendingBackup || !session) return;
    await restoreBackup(pendingBackup, { targetUserId: session.user.id });
    await reload();
    toast({ title: "Backup restored", tone: "success" });
    setPendingBackup(null);
  }

  async function handleSignOut() {
    await service.signOut();
    router.replace("/");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Settings and account.</p>
      </header>

      <Section title="Account">
        <Row label="Username" value={session?.user.username ?? ""} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setShowChangePw(true)}>
            <Shield className="h-4 w-4" /> Change password
          </Button>
          <Button variant="outline" onClick={() => setShowSwitch(true)}>
            <Repeat className="h-4 w-4" /> Switch account
          </Button>
        </div>
        <Button variant="ghost" onClick={handleSignOut} className="text-crimson">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Section>

      <Section title="Appearance">
        <div className="flex flex-wrap gap-2">
          <ThemeChip active={theme === "system"} onClick={() => setTheme("system")}>
            System
          </ThemeChip>
          <ThemeChip active={theme === "light"} onClick={() => setTheme("light")}>
            <Sun className="h-3.5 w-3.5" /> Light
          </ThemeChip>
          <ThemeChip active={theme === "dark"} onClick={() => setTheme("dark")}>
            <Moon className="h-3.5 w-3.5" /> Dark
          </ThemeChip>
        </div>
      </Section>

      <Section title="App">
        <InstallButton />
        <p className="text-xs text-muted-foreground">App version 0.1.0 — Phase 1 (local storage)</p>
      </Section>

      <Section title="Data">
        <p className="text-sm text-muted-foreground">
          Your data is currently saved on this device only. Cloud sync arrives in Phase 2.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {persistent !== null && (
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
            {persistent
              ? "Persistent storage: On — your browser has agreed to keep this data."
              : "Persistent storage isn't guaranteed yet."}
            {!persistent && (
              <button
                onClick={requestPersist}
                className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background"
              >
                Enable
              </button>
            )}
          </div>
        )}
      </Section>

      <Section title="Account Management">
        <Button variant="outline" className="text-crimson" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete Local Account
        </Button>
      </Section>

      <ChangePasswordDialog open={showChangePw} onOpenChange={setShowChangePw} />
      <SwitchAccountDialog
        open={showSwitch}
        onOpenChange={setShowSwitch}
        accounts={accounts}
        onSwitched={() => {
          refresh();
          router.replace("/app/dashboard");
        }}
      />
      <DeleteAccountDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onDeleted={() => router.replace("/")}
      />
      <RestoreDialog
        backup={pendingBackup}
        onCancel={() => setPendingBackup(null)}
        onConfirm={confirmRestore}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-border/60 bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ThemeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
        active
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border/60 text-muted-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </button>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { service } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await service.changePassword(current, next);
    setSubmitting(false);
    if (!res.ok) return setError(res.message);
    toast({ title: "Password updated", tone: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>New password</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="crimson" onClick={submit} disabled={submitting}>
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwitchAccountDialog({
  open,
  onOpenChange,
  accounts,
  onSwitched,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: { id: string; username: string; createdAt: string }[];
  onSwitched: () => void;
}) {
  const { service } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setUsername("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await service.switchAccount(username, password);
    setSubmitting(false);
    if (!res.ok) return setError(res.message);
    toast({ title: `Signed in as ${res.session.user.username}`, tone: "success" });
    onOpenChange(false);
    onSwitched();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch account</DialogTitle>
          <DialogDescription>Sign in to another local account.</DialogDescription>
        </DialogHeader>
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setUsername(a.username)}
                className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs hover:bg-muted/60"
              >
                {a.username}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Username</Label>
            <Input
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
          </div>
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="crimson" onClick={submit} disabled={submitting}>
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const { service } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await service.deleteCurrentAccount(password);
    setSubmitting(false);
    if (!res.ok) return setError(res.message);
    toast({ title: "Account deleted" });
    onOpenChange(false);
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this local account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account and all its progress from this device.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Enter your password to confirm</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && (
            <p className="rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({
  backup,
  onCancel,
  onConfirm,
}: {
  backup: Backup | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof summarizeBackup>> | null>(null);
  React.useEffect(() => {
    if (backup) void summarizeBackup(backup).then(setSummary);
    else setSummary(null);
  }, [backup]);

  return (
    <Dialog open={!!backup} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore backup?</DialogTitle>
          <DialogDescription>
            Restoring will replace the trackers and entries for your current account.
          </DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium">TasbihTrack Backup — {summary.username}</p>
            <p className="text-muted-foreground">
              {summary.trackerCount} goals · {summary.entryCount} entries
            </p>
            <p className="text-xs text-muted-foreground">
              Exported {new Date(summary.exportedAt).toLocaleString()}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="crimson" onClick={onConfirm}>Restore</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
