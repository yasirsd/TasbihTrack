import { generateId, getMeta, setMeta, deleteMeta } from "@/lib/data/local/indexed-db";
import { getRepositories } from "@/lib/data/repositories";
import type { StoredUser, UserPreferences } from "@/lib/data/types";
import type {
  AuthResponse,
  AuthService,
  AuthSession,
} from "./types";
import { hashPassword, verifyPassword } from "./password";
import { validatePassword, validateUsername } from "./username";

const SESSION_META_KEY = "session";
const SESSION_STORAGE_KEY = "tasbih.session";

interface PersistedSession {
  userId: string;
  startedAt: string;
}

export class LocalAuthService implements AuthService {
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
    if (typeof window === "undefined") return null;
    try {
      const persisted =
        readSessionFromStorage() ?? (await getMeta<PersistedSession>(SESSION_META_KEY));
      if (!persisted) return null;
      const { users } = getRepositories();
      const stored = await users.findById(persisted.userId);
      if (!stored) {
        await this.signOut();
        return null;
      }
      this.session = { user: users.toPublic(stored), startedAt: persisted.startedAt };
      writeSessionToStorage({ userId: stored.id, startedAt: persisted.startedAt });
      this.emit();
      return this.session;
    } catch {
      return null;
    }
  }

  async createAccount(username: string, password: string): Promise<AuthResponse> {
    const u = validateUsername(username);
    if (!u.ok) return { ok: false, code: "invalid_input", message: u.message };
    const p = validatePassword(password);
    if (!p.ok) return { ok: false, code: "invalid_input", message: p.message };

    const { users } = getRepositories();
    const existing = await users.findByUsername(u.normalized);
    if (existing) {
      return { ok: false, code: "username_taken", message: "That username is already used on this device." };
    }
    const { hash, salt, iterations } = await hashPassword(password);
    const now = new Date().toISOString();
    const record: StoredUser = {
      id: generateId(),
      username: u.normalized,
      usernameLower: u.normalized,
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
      createdAt: now,
      updatedAt: now,
      preferences: { theme: "system", onboardedAt: now },
    };
    await users.create(record);
    await this.startSession(record);
    return { ok: true, session: this.session! };
  }

  async signIn(username: string, password: string): Promise<AuthResponse> {
    const u = validateUsername(username);
    if (!u.ok) return { ok: false, code: "invalid_input", message: u.message };
    const { users } = getRepositories();
    const stored = await users.findByUsername(u.normalized);
    if (!stored) {
      return { ok: false, code: "invalid_credentials", message: "Username or password is incorrect." };
    }
    const ok = await verifyPassword(password, stored.passwordHash, stored.passwordSalt, stored.passwordIterations);
    if (!ok) {
      return { ok: false, code: "invalid_credentials", message: "Username or password is incorrect." };
    }
    await this.startSession(stored);
    return { ok: true, session: this.session! };
  }

  async signOut(): Promise<void> {
    this.session = null;
    await deleteMeta(SESSION_META_KEY).catch(() => {});
    clearSessionFromStorage();
    this.emit();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    if (!this.session) return { ok: false, code: "unknown_user", message: "No account signed in." };
    const p = validatePassword(newPassword);
    if (!p.ok) return { ok: false, code: "invalid_input", message: p.message };
    const { users } = getRepositories();
    const stored = await users.findById(this.session.user.id);
    if (!stored) return { ok: false, code: "unknown_user", message: "Account not found." };
    const ok = await verifyPassword(currentPassword, stored.passwordHash, stored.passwordSalt, stored.passwordIterations);
    if (!ok) return { ok: false, code: "invalid_credentials", message: "Current password is incorrect." };
    const next = await hashPassword(newPassword);
    const updated = await users.update(stored.id, {
      passwordHash: next.hash,
      passwordSalt: next.salt,
      passwordIterations: next.iterations,
    });
    this.session = { ...this.session, user: users.toPublic(updated) };
    this.emit();
    return { ok: true, session: this.session };
  }

  async listAccounts() {
    const { users } = getRepositories();
    const all = await users.list();
    return all
      .map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async switchAccount(username: string, password: string): Promise<AuthResponse> {
    await this.signOut();
    return this.signIn(username, password);
  }

  async deleteCurrentAccount(password: string): Promise<AuthResponse> {
    if (!this.session) return { ok: false, code: "unknown_user", message: "No account signed in." };
    const { users } = getRepositories();
    const stored = await users.findById(this.session.user.id);
    if (!stored) return { ok: false, code: "unknown_user", message: "Account not found." };
    const ok = await verifyPassword(password, stored.passwordHash, stored.passwordSalt, stored.passwordIterations);
    if (!ok) return { ok: false, code: "invalid_credentials", message: "Password is incorrect." };
    await users.delete(stored.id);
    const removedSession = { ...this.session };
    await this.signOut();
    return { ok: true, session: removedSession };
  }

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession | null> {
    if (!this.session) return null;
    const { users } = getRepositories();
    const updated = await users.updatePreferences(this.session.user.id, prefs);
    this.session = { ...this.session, user: users.toPublic(updated) };
    this.emit();
    return this.session;
  }

  private async startSession(stored: StoredUser): Promise<void> {
    const { users } = getRepositories();
    const startedAt = new Date().toISOString();
    this.session = { user: users.toPublic(stored), startedAt };
    const persisted: PersistedSession = { userId: stored.id, startedAt };
    await setMeta<PersistedSession>(SESSION_META_KEY, persisted).catch(() => {});
    writeSessionToStorage(persisted);
    this.emit();
  }
}

function readSessionFromStorage(): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionToStorage(s: PersistedSession): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function clearSessionFromStorage(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

let instance: AuthService | null = null;
export function getAuthService(): AuthService {
  if (!instance) instance = new LocalAuthService();
  return instance;
}
