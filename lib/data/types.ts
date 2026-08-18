export type TrackerStatus = "active" | "paused" | "completed" | "archived";

export type Gender = "male" | "female" | "prefer_not_to_say";

export interface AvatarConfig {
  /** Preset key from the curated avatar set. */
  preset: string;
  /** Skin tone id (e.g. "s1".."s5"). */
  skinTone?: string;
  /** Background color id (e.g. "b1".."b6"). */
  background?: string;
  /** Headwear id: kufi | hijab | none — must be compatible with the preset. */
  headwear?: string;
}

export interface PublicProfile {
  firstName: string | null;
  lastName: string | null;
  gender: Gender | null;
  avatar: AvatarConfig | null;
}

export interface UserPreferences {
  theme?: "system" | "light" | "dark";
  /**
   * @deprecated Streak is now always shown when non-zero. Retained on legacy
   * rows to avoid a destructive migration; ignored by product code.
   */
  showStreaks?: boolean;
  onboardedAt?: string;
  localMigrationCompletedAt?: string;
  /** Set when the legacy-user profile-completion dialog was dismissed. */
  profileCompletionDismissedAt?: string;
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
  profile: PublicProfile;
}

export interface Tracker {
  id: string;
  userId: string;
  name: string;
  arabicText?: string;
  description?: string;
  targetCount: number;
  dailyTarget?: number;
  targetDate?: string;
  status: TrackerStatus;
  isPinned: boolean;
  sortOrder: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  clientId?: string;
  name: string;
  arabicText?: string;
  description?: string;
  targetCount: number;
  dailyTarget?: number;
  targetDate?: string;
  startingProgress?: number;
}

/**
 * Extended response for adding a progress entry. `newMilestones` lists any
 * milestone percentages the entry crossed (25/50/75 or full completion is
 * captured by `completed=true`). The client uses this to decide whether to
 * show a celebration.
 */
export interface CreateEntryResult {
  entry: ProgressEntry;
  newMilestones: number[];
  completed: boolean;
}

export interface UpdateTrackerInput {
  name?: string;
  arabicText?: string;
  description?: string;
  targetCount?: number;
  dailyTarget?: number | null;
  targetDate?: string | null;
  status?: TrackerStatus;
  sortOrder?: number;
  isPinned?: boolean;
}

export interface CreateEntryInput {
  clientId?: string;
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
