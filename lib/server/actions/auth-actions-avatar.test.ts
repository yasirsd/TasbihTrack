import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 6.2 source-level invariants on updateProfileAction's avatar
 * handling. Full server integration tests would require pg + a signed
 * cookie fixture that isn't part of this project's test harness; the
 * source-level checks catch the regression patterns that could
 * re-introduce Phase 6.1.1's bug (stale legacy client erasing a valid
 * v3) or bypass Phase 6.2's gender-scoped allowlist.
 */
function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const src = read("lib/server/actions/auth-actions.ts");

function updateProfileBody(): string {
  const start = src.indexOf("export async function updateProfileAction");
  expect(start).toBeGreaterThan(-1);
  let i = src.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end + 1);
}

describe("updateProfileAction — Phase 6.2 avatar semantics", () => {
  const body = updateProfileBody();

  it("does NOT contain the pre-Phase-6.1.1 pattern that could write null on legacy input", () => {
    // This was the P0 bug fixed in 6.1.1 and must never regress.
    expect(body).not.toMatch(/sanitized \? JSON\.stringify\(sanitized\) : null/);
  });

  it("uses gender-scoped v3 sanitizer for client-supplied avatarConfig", () => {
    expect(body).toMatch(/sanitizeAvatarConfigV3ForGender/);
  });

  it("delegates gender-change avatar rewriting to avatarForGenderTransition", () => {
    expect(body).toMatch(/avatarForGenderTransition\(/);
  });

  it("uses a 'preserve' sentinel so avatar_config is only pushed into the UPDATE when the server has decided a value", () => {
    // The write is guarded by `nextAvatar !== "preserve"`. Absent
    // that, the column stays out of the UPDATE and the persisted
    // avatar remains untouched.
    expect(body).toMatch(/nextAvatar !== "preserve"/);
    // And the fields.push for avatar_config happens INSIDE that guard.
    const guardIdx = body.indexOf(`nextAvatar !== "preserve"`);
    const pushIdx = body.indexOf("fields.push(`avatar_config", guardIdx);
    expect(pushIdx).toBeGreaterThan(guardIdx);
  });

  it("never calls the ungated sanitizeAvatarConfig(input.avatarConfig) inside the update body", () => {
    // The old, ungated call would accept a v3 that mismatches the new
    // gender. All accepted v3 payloads must go through the gender-scoped
    // sanitizer.
    expect(body).not.toMatch(/sanitizeAvatarConfig\(input\.avatarConfig\)/);
  });

  it("does NOT unconditionally use defaultAvatarFor(input.gender) as an avatar reset", () => {
    expect(body).not.toMatch(/defaultAvatarFor\(input\.gender\)/);
    expect(body).not.toMatch(/defaultV3ForGender\(input\.gender\)/);
  });
});
