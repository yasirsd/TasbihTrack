export type TrackerStatus = "active" | "completed" | "archived";

export interface UserPreferences {
  theme?: "system" | "light" | "dark";
  onboardedAt?: string;
}

export interface StoredUser {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface PublicUser {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface Tracker {
  id: string;
  userId: string;
  name: string;
  arabicText?: string;
  description?: string;
  targetCount: number;
  targetDate?: string;
  status: TrackerStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  trackerId: string;
  amount: number;
  entryDate: string; // YYYY-MM-DD in local time
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrackerInput {
  name: string;
  arabicText?: string;
  description?: string;
  targetCount: number;
  targetDate?: string;
}

export interface UpdateTrackerInput {
  name?: string;
  arabicText?: string;
  description?: string;
  targetCount?: number;
  targetDate?: string | null;
  status?: TrackerStatus;
  sortOrder?: number;
}

export interface CreateEntryInput {
  trackerId: string;
  amount: number;
  entryDate?: string;
  note?: string;
}

export interface UpdateEntryInput {
  amount?: number;
  entryDate?: string;
  note?: string | null;
}
