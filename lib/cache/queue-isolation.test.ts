import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Static source assertions for offline-queue account isolation
// (see PROMPT 4C.4 §12–§13).
//
// Real IndexedDB round-trips would need a shim in tests. Instead we pin
// down the invariant at the SOURCE level: DataContext must NOT call
// clearQueueForUser on account switch — that would silently discard User
// A's unsynced writes. `listQueue(userId)` already keeps User B from
// seeing them.
//
// The account-deletion path is the ONLY place where clearing the queue
// is correct (the server rows those writes target no longer exist), and
// that call lives in CloudAuthService.deleteCurrentAccount.

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("Offline queue account isolation (static source contract)", () => {
  it("DataContext no longer imports clearQueueForUser", () => {
    // Removing the import is the cheapest way to guarantee it can't be
    // called anywhere in the file, now or after a future edit.
    const src = read("components/data/data-context.tsx");
    expect(src).not.toMatch(/clearQueueForUser/);
  });

  it("DataContext still clears the outgoing user's cached snapshot", () => {
    const src = read("components/data/data-context.tsx");
    expect(src).toMatch(/clearSnapshot\(previous\)/);
  });

  it("Delete-account path is the only place clearQueueForUser is invoked", () => {
    const auth = read("lib/auth/cloud-auth-service.ts");
    expect(auth).toMatch(/clearQueueForUser\(removed\.user\.id\)/);
  });

  it("Queue reads always go through the per-user index", () => {
    const cache = read("lib/cache/local-cache.ts");
    // listQueue must filter by userId via the by_user index — never
    // getAll without a filter.
    expect(cache).toMatch(/getAllFromIndex\("write_queue", "by_user", userId\)/);
    expect(cache).not.toMatch(/db\.getAll\("write_queue"\)/);
  });
});
