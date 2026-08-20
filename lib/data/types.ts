export type TrackerStatus = "active" | "paused" | "completed" | "archived";

export type Gender = "male" | "female" | "prefer_not_to_say";

/**
 * v3 avatar config — Dapvatar Memoji-style rendered PNG. Two stable
 * identifiers from the actual dapvatar 0.1.4 catalog:
 *   • characterId (e.g. "male-karim-white")
 *   • postureId   (e.g. "male-karim-white-1-happy")
 * Storing both means a rename of one field cannot leave the other stale.
 *
 * Phase 6.1: v1/v2 SVG configs are no longer part of the application
 * type surface. Any old blob that arrives from the DB or a backup is
 * detected purely for MIGRATION purposes (see lib/avatar/config-v3.ts
 * `isLegacyPresetConfig`) and replaced with a v3 default. The renderer
 * itself never receives v1/v2 shapes.
 */
export interface AvatarConfigV3 {
  version: 3;
  engine: "dapvatar";
  characterId: string;
  postureId: string;
}

/** The application avatar type. All rendered avatars are v3 or null. */
export type AvatarConfig = AvatarConfigV3;

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
  /**
   * Presentation preferences added in Phase 5. Three orthogonal
   * dimensions (color theme × interface style × color mode). All fields
   * optional — legacy users with no appearance block fall back to the
   * defaults defined in `lib/appearance/types.ts`.
   */
  appearance?: {
    colorTheme?: "original" | "ruby" | "emerald" | "violet" | "sunset";
    uiStyle?: "standard" | "clay";
    colorMode?: "system" | "light" | "dark";
  };
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
