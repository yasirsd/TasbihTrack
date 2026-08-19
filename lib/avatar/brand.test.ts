import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards the brand rename (§84). If any user-visible surface reverts to
 * "TasbihTrack" the corresponding assertion fails.
 */

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("Brand rename — user-facing surfaces", () => {
  it("Next metadata uses 1011 Tracker", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("1011 Tracker");
    expect(layout).not.toContain("TasbihTrack");
  });

  it("PWA manifest uses 1011 Tracker + 1011 short_name", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      name: string;
      short_name: string;
    };
    expect(manifest.name).toBe("1011 Tracker");
    expect(manifest.short_name).toBe("1011");
  });

  it("welcome shell displays the new brand", () => {
    const shell = read("components/auth/welcome-shell.tsx");
    expect(shell).toContain("1011 Tracker");
    expect(shell).not.toContain("TasbihTrack");
  });

  it("install button says Install 1011 Tracker", () => {
    const install = read("components/pwa/install-button.tsx");
    expect(install).toContain("Install 1011 Tracker");
    expect(install).not.toContain("Install TasbihTrack");
  });

  it("global-error surface renamed", () => {
    const err = read("app/global-error.tsx");
    expect(err).toContain("1011 Tracker");
    expect(err).not.toContain("TasbihTrack");
  });

  it("not-found page renamed", () => {
    const nf = read("app/not-found.tsx");
    expect(nf).toContain("Back to 1011 Tracker");
    expect(nf).not.toContain("Back to TasbihTrack");
  });
});
