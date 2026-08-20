"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Download, HardDriveDownload, LogOut, Pencil, Shield, Sparkles, Trash2, Upload } from "lucide-react";
import { useMigration } from "@/components/migration/migration-context";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { EditProfileSheet } from "@/components/profile/edit-profile-sheet";
import type { Gender } from "@/lib/data/types";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallButton } from "@/components/pwa/install-button";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/data/data-context";
import { exportBackupAction, importBackupAction } from "@/lib/server/actions/backup-actions";
import type { CloudBackupPayload } from "@/lib/server/actions/backup-schema";
import { AppearanceSettings } from "@/components/appearance/appearance-settings";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";
import { isV3Config } from "@/lib/avatar/config-v3";

// Avatar Studio is dynamically imported so the dapvatar catalog (~1,600
// metadata entries) never lands in the Profile route's initial JS. It
// loads only when the user actually taps Customize Avatar.
const AvatarStudio = dynamic(
  () => import("@/components/avatar/avatar-studio").then((m) => m.AvatarStudio),
  { ssr: false },
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProfilePage() {
  const { session, service } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { reload } = useData();
  const [showChangePw, setShowChangePw] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [pendingBackup, setPendingBackup] = React.useState<
    (CloudBackupPayload & { user?: { username: string } }) | null
  >(null);
  const [persistent, setPersistent] = React.useState<boolean | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && "storage" in navigator && "persisted" in navigator.storage) {
      void navigator.storage.persisted().then(setPersistent);
    }
  }, []);

  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [avatarStudioOpen, setAvatarStudioOpen] = React.useState(false);
  const profile = session?.user.profile;
  const v3Config = isV3Config(profile?.avatar) ? profile.avatar : null;
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.firstName ?? session?.user.username ?? "";

  async function requestPersist() {
    if (!("storage" in navigator) || !("persist" in navigator.storage)) return;
    const ok = await navigator.storage.persist();
    setPersistent(ok);
    toast({ title: ok ? "Persistent storage enabled" : "Browser declined persistent storage" });
  }

  async function handleExport() {
    if (!session) return;
    const payload = await exportBackupAction();
    const name = `1011tracker-${session.user.username}-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJson(name, payload);
    toast({ title: "Backup exported", tone: "success" });
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      setPendingBackup(raw);
    } catch {
      toast({ title: "Couldn't read file", tone: "destructive" });
    }
  }

  async function confirmRestore() {
    if (!pendingBackup) return;
    try {
      await importBackupAction(pendingBackup);
      await reload();
      toast({ title: "Backup restored", tone: "success" });
    } catch (e) {
      toast({ title: "Invalid backup", description: (e as Error).message, tone: "destructive" });
    } finally {
      setPendingBackup(null);
    }
  }

  async function handleSignOut() {
    await service.signOut();
    router.replace("/");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <UserAvatar
          config={profile?.avatar ?? null}
          size={112}
          alt="Your profile avatar"
          loading="eager"
          className="rounded-full ring-2 ring-border/60 ring-offset-2 ring-offset-background"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            @{session?.user.username}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {profile?.gender === "male" || profile?.gender === "female" ? (
            <Button
              variant="crimson"
              size="sm"
              onClick={() => setAvatarStudioOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" /> Customize Avatar
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditProfileOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </Button>
        </div>
        {profile?.gender !== "male" && profile?.gender !== "female" && (
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Choose Male or Female in Edit Profile to use a 1011 Avatar.
          </p>
        )}
      </header>

      <Section title="Account">
        {/* Phase 7.2 P0.5 — two balanced equal-width controls. Both use
         * the outline variant so they share visual weight; Sign Out is
         * tinted crimson to read as secondary/destructive without
         * shouting. `h-12` (48 px) meets the touch-target audit. */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => setShowChangePw(true)}
            className="h-12 w-full"
          >
            <Shield className="h-4 w-4" /> Change password
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="h-12 w-full text-crimson"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </Section>

      <Section title="Appearance">
        <AppearanceSettings />
      </Section>

      <Section title="App">
        <InstallButton />
        <p className="text-xs text-muted-foreground">
          Cloud sync is on. Your data is stored securely and synchronized across your devices.
        </p>
      </Section>

      <Section title="Credits">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Avatar characters and expressions are rendered by{" "}
            <a
              href="https://github.com/joshuanwankwo/dapvatar"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              dapvatar
            </a>{" "}
            (MIT).
          </p>
          <p>
            Memoji artwork by{" "}
            <a
              href="https://www.figma.com/@m031n"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Moein Rabti (@m031n)
            </a>
            , licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              CC BY 4.0
            </a>
            . Assets are indexed and served from our own origin — no visual modifications.
          </p>
        </div>
      </Section>

      <Section title="Data">
        <ImportLocalRow />
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
              ? "This device is allowed to keep an offline cache."
              : "This device may evict its offline cache."}
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

      <Section title="Account Management" variant="danger">
        <Button variant="outline" className="text-crimson" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete Account
        </Button>
      </Section>

      <ChangePasswordDialog open={showChangePw} onOpenChange={setShowChangePw} />
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
      {avatarStudioOpen && (
        <AvatarStudio
          open={avatarStudioOpen}
          onOpenChange={setAvatarStudioOpen}
          initialConfig={v3Config}
          gender={(profile?.gender ?? null) as Gender | null}
        />
      )}
      <EditProfileSheet
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        initial={{
          firstName: profile?.firstName ?? "",
          lastName: profile?.lastName ?? "",
          gender: (profile?.gender ?? "prefer_not_to_say") as Gender,
          avatarConfig: profile?.avatar ?? null,
        }}
      />
    </div>
  );
}

function Section({
  title,
  variant = "default",
  children,
}: {
  title: string;
  /**
   * "default" — participates in the Clay system via `.clay-card`.
   * "danger"  — deliberately opts OUT of Clay so the delete-account
   *             region reads as a serious/destructive area even under
   *             Playful Clay UI (see PROMPT 5.1 §1). Standard mode is
   *             unaffected either way.
   */
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={cn(
          "mb-2 px-4 text-[11px] font-medium uppercase tracking-[0.18em]",
          variant === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {title}
      </h2>
      <div
        className={cn(
          "space-y-3 rounded-3xl border p-4",
          variant === "danger"
            ? "border-destructive/40 bg-destructive/[0.04]"
            : "clay-card border-border/60 bg-card",
        )}
      >
        {children}
      </div>
    </section>
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
    toast({
      title: "Password updated",
      description: "Other devices signed out for security.",
      tone: "success",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Other devices will be signed out.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField id="cp-current" label="Current password">
            <Input
              id="cp-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Your current password"
            />
          </FormField>
          <FormField id="cp-next" label="New password" hint="At least 6 characters.">
            <Input
              id="cp-next"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Choose a new password"
            />
          </FormField>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
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
          <DialogTitle>Delete this account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account and all its progress.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField
            id="da-password"
            label="Enter your password to confirm"
          >
            <Input
              id="da-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
            />
          </FormField>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
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
  backup: (CloudBackupPayload & { user?: { username: string } }) | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!backup} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore backup?</DialogTitle>
          <DialogDescription>
            Restoring will replace the trackers and entries on your account.
          </DialogDescription>
        </DialogHeader>
        {backup && (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium">1011 Tracker backup{backup.user ? ` — ${backup.user.username}` : ""}</p>
            <p className="text-muted-foreground">
              {backup.trackers?.length ?? 0} goals · {backup.entries?.length ?? 0} entries
            </p>
            {backup.exportedAt && (
              <p className="text-xs text-muted-foreground">
                Exported {new Date(backup.exportedAt).toLocaleString()}
              </p>
            )}
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

// Manual re-entry into the Phase-1 → cloud migration dialog. Only rendered
// when a candidate is actually detected AND migration hasn't completed.
function ImportLocalRow() {
  const { candidate, openDialog } = useMigration();
  if (!candidate) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Local progress on this device</p>
        <p className="truncate text-xs text-muted-foreground">
          {candidate.trackerCount === 1 ? "1 goal" : `${candidate.trackerCount} goals`}
          {" · "}
          {candidate.entryCount === 1 ? "1 entry" : `${candidate.entryCount} entries`}{" "}
          not yet imported.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={openDialog}>
        <HardDriveDownload className="h-4 w-4" /> Import
      </Button>
    </div>
  );
}
