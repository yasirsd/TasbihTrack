"use client";
import {
  changePasswordAction,
  currentUserAction,
  deleteAccountAction,
  loginAction,
  logoutAction,
  registerAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/lib/server/actions/auth-actions";
import type { AuthPublicUser } from "@/lib/server/actions/auth-schemas";
import type {
  AuthErrorCode,
  AuthResponse,
  AuthService,
  AuthSession,
  ProfileUpdatePayload,
  RegistrationPayload,
} from "./types";
import type { PublicUser, UserPreferences } from "@/lib/data/types";

function toSession(user: AuthPublicUser): AuthSession {
  return {
    user: user as PublicUser,
    startedAt: new Date().toISOString(),
  };
}

export class CloudAuthService implements AuthService {
  private session: AuthSession | null = null;
  private listeners = new Set<(s: AuthSession | null) => void>();

  private emit() {
    for (const l of this.listeners) l(this.session);
  }

  onChange(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  currentSession(): AuthSession | null {
    return this.session;
  }

  async init(): Promise<AuthSession | null> {
    try {
      const res = await currentUserAction();
      this.session = res.ok && res.user ? toSession(res.user) : null;
      this.emit();
      return this.session;
    } catch {
      return null;
    }
  }

  async createAccount(payload: RegistrationPayload): Promise<AuthResponse> {
    const res = await registerAction(payload, payload.rememberMe ?? true);
    if (!res.ok || !res.user) {
      return { ok: false, code: mapCode(res.code), message: res.error ?? "Couldn't create account." };
    }
    this.session = toSession(res.user);
    this.emit();
    return { ok: true, session: this.session };
  }

  async signIn(
    username: string,
    password: string,
    rememberMe: boolean = true,
  ): Promise<AuthResponse> {
    const res = await loginAction(username, password, rememberMe);
    if (!res.ok || !res.user) {
      return { ok: false, code: mapCode(res.code), message: res.error ?? "Sign in failed." };
    }
    this.session = toSession(res.user);
    this.emit();
    return { ok: true, session: this.session };
  }

  async signOut(): Promise<void> {
    await logoutAction();
    this.session = null;
    this.emit();
  }

  async changePassword(current: string, next: string): Promise<AuthResponse> {
    const res = await changePasswordAction(current, next);
    if (!res.ok || !res.user) {
      return { ok: false, code: mapCode(res.code), message: res.error ?? "Couldn't change password." };
    }
    this.session = toSession(res.user);
    this.emit();
    return { ok: true, session: this.session };
  }

  async listAccounts() {
    return [];
  }

  async switchAccount(username: string, password: string): Promise<AuthResponse> {
    await this.signOut();
    return this.signIn(username, password);
  }

  async deleteCurrentAccount(password: string): Promise<AuthResponse> {
    const res = await deleteAccountAction(password);
    if (!res.ok) {
      return { ok: false, code: mapCode(res.code), message: res.error ?? "Couldn't delete account." };
    }
    const removed = this.session;
    this.session = null;
    this.emit();
    return { ok: true, session: removed ?? ({} as AuthSession) };
  }

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession | null> {
    const res = await updatePreferencesAction(prefs);
    if (res.ok && res.user) {
      this.session = toSession(res.user);
      this.emit();
    }
    return this.session;
  }

  async updateProfile(patch: ProfileUpdatePayload): Promise<AuthResponse> {
    const res = await updateProfileAction(patch);
    if (!res.ok || !res.user) {
      return { ok: false, code: mapCode(res.code), message: res.error ?? "Couldn't update profile." };
    }
    this.session = toSession(res.user);
    this.emit();
    return { ok: true, session: this.session };
  }
}

function mapCode(code?: string): AuthErrorCode {
  switch (code) {
    case "invalid_input":
      return "invalid_input";
    case "username_taken":
      return "username_taken";
    case "invalid_credentials":
    case "rate_limited":
      return "invalid_credentials";
    case "unauthorized":
      return "unknown_user";
    default:
      return "internal";
  }
}
