// Schemas + types shared between the server action file (which is
// "use server" and may only export async functions) and any client consumer.
import { z } from "zod";
import { passwordSchema, usernameSchema } from "@/lib/validation";
import type { PublicProfile, UserPreferences } from "@/lib/data/types";

const trimmedName = (opts: { min: number; max: number; label: string }) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(opts.min, `${opts.label} is required.`)
        .max(opts.max, `${opts.label} is too long.`),
    );

export const registrationSchema = z.object({
  firstName: trimmedName({ min: 1, max: 60, label: "First name" }),
  lastName: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(60, "Last name is too long.")),
  gender: z.enum(["male", "female", "prefer_not_to_say"]),
  username: usernameSchema,
  password: passwordSchema,
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const profileUpdateSchema = z.object({
  firstName: trimmedName({ min: 1, max: 60, label: "First name" }).optional(),
  lastName: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(60))
    .optional(),
  gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
  avatarConfig: z.unknown().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export interface AuthPublicUser {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
  profile: PublicProfile;
}

export interface AuthActionResult {
  ok: boolean;
  user?: AuthPublicUser;
  error?: string;
  code?:
    | "invalid_input"
    | "username_taken"
    | "invalid_credentials"
    | "rate_limited"
    | "unauthorized"
    | "internal";
}
