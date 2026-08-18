import type {
  CreateEntryInput,
  CreateTrackerInput,
  ProgressEntry,
  PublicUser,
  StoredUser,
  Tracker,
  UpdateEntryInput,
  UpdateTrackerInput,
  UserPreferences,
} from "@/lib/data/types";

export interface UserRepository {
  create(user: Omit<StoredUser, "createdAt" | "updatedAt"> & { createdAt?: string }): Promise<StoredUser>;
  findByUsername(usernameLower: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  list(): Promise<StoredUser[]>;
  update(id: string, patch: Partial<StoredUser>): Promise<StoredUser>;
  updatePreferences(id: string, prefs: Partial<UserPreferences>): Promise<StoredUser>;
  delete(id: string): Promise<void>;
  toPublic(user: StoredUser): PublicUser;
}

export interface TrackerRepository {
  create(userId: string, input: CreateTrackerInput): Promise<Tracker>;
  update(userId: string, id: string, patch: UpdateTrackerInput): Promise<Tracker>;
  delete(userId: string, id: string): Promise<void>;
  get(userId: string, id: string): Promise<Tracker | null>;
  listForUser(userId: string): Promise<Tracker[]>;
}

export interface EntryRepository {
  create(userId: string, input: CreateEntryInput): Promise<ProgressEntry>;
  update(userId: string, id: string, patch: UpdateEntryInput): Promise<ProgressEntry>;
  delete(userId: string, id: string): Promise<void>;
  get(userId: string, id: string): Promise<ProgressEntry | null>;
  listForUser(userId: string): Promise<ProgressEntry[]>;
  listForTracker(userId: string, trackerId: string): Promise<ProgressEntry[]>;
  deleteAllForTracker(userId: string, trackerId: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
