// Server-side read of the appearance cookie. Consumed by app/layout.tsx so
// the pre-paint <html data-color-theme=… data-ui-style=…> attributes match
// the user's preference on the very first render — no color flash.
import { cookies } from "next/headers";
import { APPEARANCE_COOKIE, parseAppearance, type Appearance } from "./types";

export async function readAppearanceCookie(): Promise<Appearance> {
  const jar = await cookies();
  return parseAppearance(jar.get(APPEARANCE_COOKIE)?.value);
}
