"use client";
import * as React from "react";
import { CloudAuthService } from "@/lib/auth/cloud-auth-service";
import type { AuthService, AuthSession } from "@/lib/auth/types";

interface AuthContextValue {
  service: AuthService;
  session: AuthSession | null;
  loading: boolean;
  refresh: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [service] = React.useState<AuthService>(() => new CloudAuthService());
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    service
      .init()
      .then((s) => {
        if (!mounted) return;
        setSession(s);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const unsub = service.onChange((s) => setSession(s));
    return () => {
      mounted = false;
      unsub();
    };
  }, [service, nonce]);

  const refresh = React.useCallback(() => setNonce((n) => n + 1), []);

  return (
    <AuthContext.Provider value={{ service, session, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
