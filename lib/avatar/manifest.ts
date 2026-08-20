// 1011 curated avatar manifest.
//
// Phase 6.2 permanently narrows the app's human-avatar surface to TWO
// characters. This file replaces the 1,600-entry dapvatar catalog with
// a hand-committed manifest listing only the postures 1011 actually
// ships. There is no generator step: the file is source-of-truth in
// git, and the corresponding PNGs live under public/avatar-assets/v1/.
//
// If you edit this list, update `scripts/verify-1011-avatar-assets.mjs`
// so the build fails when the on-disk PNGs and the manifest disagree.
//
// See THIRD_PARTY_NOTICES.md — the artwork originated in the
// verified `dapvatar@0.1.4` package, "+1500 Memoji Pack (Community)"
// by Moein Rabti, CC BY 4.0. Assets are served as-provided.

export const AVATAR_ASSET_SET_VERSION = "v1" as const;
export const AVATAR_ASSET_BASE = "/avatar-assets/v1";

export type PostureKey =
  | "happy"
  | "laughing"
  | "sad"
  | "crying"
  | "heart-eye"
  | "sleeping"
  | "mind-blowing"
  | "star-eye"
  | "lovely"
  | "kiss"
  | "party"
  | "angry"
  | "triumph"
  | "bad-word"
  | "grinning"
  | "winking"
  | "happy-winking"
  | "shocked"
  | "rolling-eyes"
  | "like"
  | "dislike"
  | "victory"
  | "hugging"
  | "fist-pump"
  | "mouth-covering"
  | "crossing-fingers"
  | "shush"
  | "thinking"
  | "scream";

export interface CuratedPosture {
  key: PostureKey;
  /** Human-readable label surfaced in Avatar Studio + a11y. */
  label: string;
  /** Numeric prefix in the PNG filename (matches dapvatar's naming). */
  postureNumber: number;
  /** Persisted posture id — the field that lives in `avatar_config.postureId`. */
  postureId: string;
  /** Filename inside the character directory. */
  asset: string;
}

export interface CuratedCharacter {
  id: "male-karim-white" | "female-kulthum-white";
  name: "Karim" | "Kulthum";
  gender: "male" | "female";
  defaultExpression: PostureKey;
  defaultPostureId: string;
  /** Ordered list — Avatar Studio renders in this order. */
  expressions: readonly CuratedPosture[];
}

/**
 * Every posture key that exists on BOTH characters uses the same
 * numeric prefix in dapvatar's naming scheme. That means the shared
 * numbering table below is authoritative for both.
 *
 * `label` uses our curated copy (dapvatar's raw labels have quirks —
 * `heart-eye` is "Heart Eye", `fist-pump` is "Fisting", `shush` is
 * "Sh!"). We standardise here so nothing weird surfaces in Studio.
 */
const CURATED_LABELS: Record<PostureKey, string> = {
  happy: "Happy",
  laughing: "Laughing",
  sad: "Sad",
  crying: "Crying",
  "heart-eye": "Heart Eyes",
  sleeping: "Sleeping",
  "mind-blowing": "Mind Blown",
  "star-eye": "Star Eyes",
  lovely: "Lovely",
  kiss: "Kiss",
  party: "Party",
  angry: "Angry",
  triumph: "Triumph",
  "bad-word": "Bad Word",
  grinning: "Grinning",
  winking: "Winking",
  "happy-winking": "Happy Winking",
  shocked: "Shocked",
  "rolling-eyes": "Rolling Eyes",
  like: "Like",
  dislike: "Dislike",
  victory: "Victory",
  hugging: "Hugging",
  "fist-pump": "Fist Pump",
  "mouth-covering": "Mouth Covering",
  "crossing-fingers": "Crossing Fingers",
  shush: "Shush",
  thinking: "Thinking",
  scream: "Scream",
};

const POSTURE_ORDER: readonly { key: PostureKey; num: number }[] = [
  { key: "happy", num: 1 },
  { key: "laughing", num: 2 },
  { key: "sad", num: 3 },
  { key: "crying", num: 4 },
  { key: "heart-eye", num: 5 },
  { key: "sleeping", num: 6 },
  { key: "mind-blowing", num: 7 },
  { key: "star-eye", num: 8 },
  { key: "lovely", num: 9 },
  { key: "kiss", num: 10 },
  { key: "party", num: 11 },
  { key: "angry", num: 12 },
  { key: "triumph", num: 13 },
  { key: "bad-word", num: 14 },
  { key: "grinning", num: 15 },
  { key: "winking", num: 16 },
  { key: "happy-winking", num: 17 },
  { key: "shocked", num: 18 },
  { key: "rolling-eyes", num: 19 },
  { key: "like", num: 20 },
  { key: "dislike", num: 21 },
  { key: "victory", num: 22 },
  { key: "hugging", num: 23 },
  { key: "fist-pump", num: 24 },
  { key: "mouth-covering", num: 25 },
  { key: "crossing-fingers", num: 26 },
  { key: "shush", num: 27 },
  { key: "thinking", num: 28 },
  { key: "scream", num: 29 },
];

function buildCharacter(
  id: "male-karim-white" | "female-kulthum-white",
  name: "Karim" | "Kulthum",
  gender: "male" | "female",
  defaultExpression: PostureKey,
): CuratedCharacter {
  const expressions = POSTURE_ORDER.map(({ key, num }) => {
    const pad = String(num).padStart(2, "0");
    return {
      key,
      label: CURATED_LABELS[key],
      postureNumber: num,
      postureId: `${id}-${num}-${key}`,
      asset: `${pad}-${key}.png`,
    } satisfies CuratedPosture;
  });
  const defaultPosture = expressions.find((e) => e.key === defaultExpression)!;
  return {
    id,
    name,
    gender,
    defaultExpression,
    defaultPostureId: defaultPosture.postureId,
    expressions,
  };
}

export const KARIM: CuratedCharacter = buildCharacter(
  "male-karim-white",
  "Karim",
  "male",
  "happy",
);

export const KULTHUM: CuratedCharacter = buildCharacter(
  "female-kulthum-white",
  "Kulthum",
  "female",
  "heart-eye",
);

/** Ordered by gender for stable iteration. */
export const AVATAR_CHARACTERS: readonly CuratedCharacter[] = [KARIM, KULTHUM];

export const AVATAR_CHARACTER_BY_ID: Readonly<
  Record<string, CuratedCharacter | undefined>
> = {
  [KARIM.id]: KARIM,
  [KULTHUM.id]: KULTHUM,
};

export function characterForGender(
  gender: "male" | "female" | "prefer_not_to_say" | null | undefined,
): CuratedCharacter | null {
  if (gender === "male") return KARIM;
  if (gender === "female") return KULTHUM;
  return null;
}

export function humanLabelFor(key: string): string {
  return (
    CURATED_LABELS[key as PostureKey] ??
    key
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ")
  );
}

/**
 * Milestone-reaction → posture key. Numbers are pulled from the shared
 * character POSTURE_ORDER — every character in this manifest supports
 * these keys, so celebration always resolves.
 */
export const REACTION_POSTURE_KEYS = {
  25: "star-eye",
  50: "heart-eye",
  75: "party",
  100: "mind-blowing",
} as const;
