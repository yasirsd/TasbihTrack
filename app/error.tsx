"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface to Vercel/browser devtools without leaking to end-users.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          We couldn't load that just now.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your progress is safe. Try again — if it keeps happening, sign out
          and back in.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="crimson" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/dashboard">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
