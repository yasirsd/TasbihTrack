import { describe, expect, it } from "vitest";
import { sanitizeConnectionString } from "./pg-config.mjs";

describe("sanitizeConnectionString", () => {
  it("removes sslmode", () => {
    const out = sanitizeConnectionString(
      "postgres://u:p@host:6543/db?sslmode=require",
    );
    expect(out).not.toContain("sslmode");
  });

  it("removes every ssl-* parameter", () => {
    const url =
      "postgres://u:p@host:6543/db" +
      "?sslmode=require&sslcert=/x&sslkey=/y&sslrootcert=/z&sslcrl=/c&sslpassword=s&sslnegotiation=direct&ssl=true";
    const out = sanitizeConnectionString(url);
    for (const key of [
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "sslcrl",
      "sslpassword",
      "sslnegotiation",
      "ssl=",
    ]) {
      expect(out).not.toContain(key);
    }
  });

  it("preserves unrelated Supabase/pooler params", () => {
    const url =
      "postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" +
      "?sslmode=require&pgbouncer=true&supa=base-pooler.x";
    const out = sanitizeConnectionString(url);
    expect(out).toContain("pgbouncer=true");
    expect(out).toContain("supa=base-pooler.x");
    expect(out).not.toContain("sslmode");
  });

  it("preserves userinfo, host, port, db path", () => {
    const out = sanitizeConnectionString(
      "postgres://user.name:pw@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require",
    );
    expect(out).toContain("user.name");
    expect(out).toContain("aws-0-region.pooler.supabase.com:6543");
    expect(out).toContain("/postgres");
  });

  it("throws on empty input", () => {
    expect(() => sanitizeConnectionString("")).toThrow();
  });
});
