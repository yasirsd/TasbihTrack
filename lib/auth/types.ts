import type {
  AvatarConfig,
  Gender,
  PublicUser,
  UserPreferences,
} from "@/lib/data/types";

export interface AuthSession {
  user: PublicUser;
  startedAt: string;
}

export interface AuthResult {
  ok: true;
  session: AuthSession;
}

export interface AuthError {
  ok: false;
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | "invalid_input"
  | "username_taken"
  | "unknown_user"
  | "invalid_credentials"
  | "unsupported_environment"
  | "internal";

export type AuthResponse = AuthResult | AuthError;

export interface RegistrationPayload {
  firstName: string;
  lastName: string;
  gender: Gender;
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  avatarConfig?: AvatarConfig;
}

export interface AuthService {
  init(): Promise<AuthSession | null>;
  currentSession(): AuthSession | null;
  createAccount(payload: RegistrationPayload): Promise<AuthResponse>;
  signIn(username: string, password: string, rememberMe?: boolean): Promise<AuthResponse>;
  signOut(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse>;
  listAccounts(): Promise<{ id: string; username: string; createdAt: string }[]>;
  switchAccount(username: string, password: string): Promise<AuthResponse>;
  deleteCurrentAccount(password: string): Promise<AuthResponse>;
  updatePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession | null>;
  updateProfile(patch: ProfileUpdatePayload): Promise<AuthResponse>;
  onChange(listener: (session: AuthSession | null) => void): () => void;
}
