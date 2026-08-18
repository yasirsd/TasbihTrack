"use client";
import * as React from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIosSheet, setShowIosSheet] = React.useState(false);

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
      window.navigator.standalone;
    if (isStandalone) setInstalled(true);
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));

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
        <Download className="h-4 w-4" /> Install TasbihTrack
      </Button>
    );
  }

  if (isIOS) {
    return (
      <div className="space-y-2">
        <Button variant="outline" onClick={() => setShowIosSheet((v) => !v)}>
          <Share2 className="h-4 w-4" /> Install on iPhone
        </Button>
        {showIosSheet && (
          <p className="rounded-2xl border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
            In Safari, tap the Share icon, then choose <span className="font-medium text-foreground">Add to Home Screen</span>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      Install is offered by your browser when supported. Open TasbihTrack in a Chromium browser to see the prompt.
    </div>
  );
}
