import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
        <p className="text-sm text-muted-foreground">
          This page isn't here.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Back to TasbihTrack
        </Link>
      </div>
    </main>
  );
}
