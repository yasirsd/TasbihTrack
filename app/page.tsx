import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/session";
import { WelcomeShell } from "@/components/auth/welcome-shell";

/**
 * Server-side gate. If the request already carries a valid session cookie,
 * we redirect *before any HTML is emitted* — the user never sees a flash
 * of Sign In. Only unauthenticated visitors get the welcome experience.
 *
 * The session lookup runs against Postgres via the existing session
 * service; there is no second auth architecture.
 */
export default async function WelcomePage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/app/dashboard");
  return <WelcomeShell />;
}
