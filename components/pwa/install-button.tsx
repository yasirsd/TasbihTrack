"use client";
import * as React from "react";
import { Download, Home, Plus, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Install entry point. Behavior:
 *
 *   • Already installed (standalone display-mode) → renders nothing.
 *   • Chromium with a captured `beforeinstallprompt` → offers native prompt.
 *   • iOS Safari → opens a polished Sheet with 4 numbered steps + icons.
 *   • iOS non-Safari → same Sheet, but the first step tells the user to
 *     open the page in Safari before installing.
 *   • Other → subtle explanatory text.
 */
export function InstallButton() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isSafariOnIOS, setIsSafariOnIOS] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(ios);
    // Detect Safari vs Chrome/Firefox/Edge WebView on iOS
    setIsSafariOnIOS(ios && !/CriOS|FxiOS|EdgiOS|OPT\/|GSA\//.test(ua));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="text-sm text-muted-foreground">
        Installed as a standalone app.
      </div>
    );
  }

  if (deferred) {
    return (
      <Button
        variant="crimson"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        <Download className="h-4 w-4" /> Install 1011 Tracker
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button variant="outline" onClick={() => setSheetOpen(true)}>
          <Share2 className="h-4 w-4" /> Install on iPhone
        </Button>
        <IOSInstallSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          isSafari={isSafariOnIOS}
        />
      </>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      Install is offered by your browser when supported. Open 1011 Tracker in a
      Chromium browser to see the prompt.
    </div>
  );
}

// ---------------------------------------------------------------------------
// iOS install instructions sheet
// ---------------------------------------------------------------------------

function IOSInstallSheet({
  open,
  onOpenChange,
  isSafari,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSafari: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Install 1011 Tracker</SheetTitle>
          <SheetDescription>Keep your journey one tap away.</SheetDescription>
        </SheetHeader>

        {!isSafari && (
          <div className="mb-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            <p className="font-medium text-gold-deep">Open in Safari first</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add to Home Screen is only available in Safari on iOS.
            </p>
          </div>
        )}

        <ol className="space-y-3">
          <Step index={1} icon={<Share2 className="h-4 w-4" />}>
            Tap <strong>Share</strong> at the bottom of the screen.
          </Step>
          <Step index={2} icon={<Plus className="h-4 w-4" />}>
            Choose <strong>Add to Home Screen</strong>.
          </Step>
          <Step index={3} icon={<Settings className="h-4 w-4" />}>
            Turn on <strong>Open as Web App</strong>.
          </Step>
          <Step index={4} icon={<Home className="h-4 w-4" />}>
            Tap <strong>Add</strong>.
          </Step>
        </ol>
      </SheetContent>
    </Sheet>
  );
}

function Step({
  index,
  icon,
  children,
}: {
  index: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson"
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Step {index}
        </p>
        <p className="mt-0.5 text-sm">{children}</p>
      </div>
    </li>
  );
}
