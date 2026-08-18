export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function validateUsername(raw: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Enter a username." };
  const lower = trimmed.toLowerCase();
  if (lower.length < 3) return { ok: false, message: "Username needs at least 3 characters." };
  if (lower.length > 20) return { ok: false, message: "Username must be 20 characters or fewer." };
  if (!USERNAME_PATTERN.test(lower)) {
    return {
      ok: false,
      message: "Use lowercase letters, numbers, and underscore only.",
    };
  }
  return { ok: true, normalized: lower };
}

export function validatePassword(pw: string): { ok: true } | { ok: false; message: string } {
  if (!pw) return { ok: false, message: "Enter a password." };
  if (pw.length < 6) return { ok: false, message: "Password needs at least 6 characters." };
  if (pw.length > 128) return { ok: false, message: "Password is too long." };
  return { ok: true };
}
