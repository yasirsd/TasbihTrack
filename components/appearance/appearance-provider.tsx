"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import {
  APPEARANCE_COOKIE,
  DEFAULT_APPEARANCE,
  serializeAppearance,
  type Appearance,
  type ColorMode,
  type ColorTheme,
  type UIStyle,
} from "@/lib/appearance/types";
import { useAuth } from "@/components/auth/auth-context";
import type { UserPreferences } from "@/lib/data/types";

/**
 * Central store for the 3 orthogonal appearance dimensions.
 *
 *   • Local writes are instant — we set the root data-attribute + cookie
 *     synchronously, then fire-and-forget the server persist.
 *   • Color mode delegates to next-themes so its existing SSR + system
 *     handling keeps working. We do NOT rebuild it.
 *   • Signed-in users have their appearance mirrored to
 *     users.preferences.appearance (JSONB, non-blocking).
 *   • A React <Context> exists only so the settings screen can read state;
 *     feature components never subscribe — they consume CSS variables via
 *     the root `data-*` attributes, which cost zero re-renders.
 */

interface AppearanceContextValue {
  appearance: Appearance;
  setColorTheme: (v: ColorTheme) => void;
  setUIStyle: (v: UIStyle) => void;
  setColorMode: (v: ColorMode) => void;
}

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null);

const APPEARANCE_MAX_AGE_DAYS = 365;

function writeCookie(a: Appearance) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(serializeAppearance(a));
  const maxAge = APPEARANCE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${APPEARANCE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyRoot(theme: ColorTheme, style: UIStyle) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-color-theme", theme);
  el.setAttribute("data-ui-style", style);
}

export interface AppearanceProviderProps {
  initial: Appearance;
  children: React.ReactNode;
}

export function AppearanceProvider({ initial, children }: AppearanceProviderProps) {
  // Keep two local states so writes feel instant. Do NOT put appearance in
  // any provider that data-heavy screens subscribe to — that would trigger
  // giant re-renders when a user toggled the palette.
  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(initial.colorTheme);
  const [uiStyle, setUIStyleState] = React.useState<UIStyle>(initial.uiStyle);
  const { theme: nextTheme, setTheme, resolvedTheme: _ignored } = useTheme();

  // Derive current color mode from next-themes so both providers agree
  // without a second source of truth.
  const colorMode = (
    nextTheme === "light" || nextTheme === "dark" || nextTheme === "system"
      ? nextTheme
      : initial.colorMode
  ) as ColorMode;

  const auth = useAuth();
  const service = auth.service;
  const userId = auth.session?.user.id ?? null;

  // On first mount, ensure the DOM matches state (in case the pre-paint
  // script did nothing and there's still a `original/standard` default).
  React.useEffect(() => {
    applyRoot(colorTheme, uiStyle);
  }, [colorTheme, uiStyle]);

  // Persist appearance changes to the signed-in user's preferences.
  // Fire-and-forget: interaction never blocks on the network. Failures are
  // logged only.
  const persistToServer = React.useCallback(
    (patch: Partial<Appearance>) => {
      if (!userId) return;
      const nextAppearance: Appearance = {
        colorTheme,
        uiStyle,
        colorMode,
        ...patch,
      };
      void service
        .updatePreferences({ appearance: nextAppearance } as Partial<UserPreferences>)
        .catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("appearance persist failed", err);
          }
        });
    },
    [service, userId, colorTheme, uiStyle, colorMode],
  );

  const setColorTheme = React.useCallback(
    (v: ColorTheme) => {
      setColorThemeState(v);
      applyRoot(v, uiStyle);
      writeCookie({ colorTheme: v, uiStyle, colorMode });
      persistToServer({ colorTheme: v });
    },
    [uiStyle, colorMode, persistToServer],
  );

  const setUIStyle = React.useCallback(
    (v: UIStyle) => {
      setUIStyleState(v);
      applyRoot(colorTheme, v);
      writeCookie({ colorTheme, uiStyle: v, colorMode });
      persistToServer({ uiStyle: v });
    },
    [colorTheme, colorMode, persistToServer],
  );

  const setColorMode = React.useCallback(
    (v: ColorMode) => {
      setTheme(v);
      writeCookie({ colorTheme, uiStyle, colorMode: v });
      persistToServer({ colorMode: v });
    },
    [setTheme, colorTheme, uiStyle, persistToServer],
  );

  // Account-switch precedence (PROMPT 5.1 — appearance account-switch audit):
  //
  //   1. On sign-in: the SERVER preference wins. Whatever User A had picked
  //      while signed out gets replaced by whatever User B stored in their
  //      profile. The cookie is overwritten so this looks consistent across
  //      hard refreshes. If User B has never saved an appearance, they get
  //      the current local browser preference as their default (that
  //      preference then gets persisted to B — new users effectively inherit
  //      the browser's look, which is the friendliest first-run behaviour).
  //   2. On sign-out: appearance state stays exactly where the previous
  //      user left it. The cookie survives so the same browser sees the
  //      same look on the Sign In screen. We DO NOT write back to any
  //      user profile at this point.
  //   3. New account (signup): as case (1) with "never saved" — the
  //      browser's current appearance becomes the new account's default
  //      and gets stored.
  //
  // Result — A's Violet Clay Dark never gets written into B's profile,
  // and B always ends up with B's appearance after sign-in.
  const lastSyncedUserRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!userId) {
      // Sign-out — reset the guard so a re-sign-in re-syncs. Do NOT touch
      // colors: the local preference stays in the cookie and DOM.
      lastSyncedUserRef.current = null;
      return;
    }
    if (lastSyncedUserRef.current === userId) return;
    lastSyncedUserRef.current = userId;
    const stored = (auth.session?.user.preferences as UserPreferences | undefined)
      ?.appearance;
    if (stored && (stored.colorTheme || stored.uiStyle || stored.colorMode)) {
      // (1) SERVER-WINS: adopt every field the user has ever saved.
      const nextTheme = stored.colorTheme ?? colorTheme;
      const nextStyle = stored.uiStyle ?? uiStyle;
      const nextMode = stored.colorMode ?? colorMode;
      if (stored.colorTheme && stored.colorTheme !== colorTheme) {
        setColorThemeState(stored.colorTheme);
      }
      if (stored.uiStyle && stored.uiStyle !== uiStyle) {
        setUIStyleState(stored.uiStyle);
      }
      applyRoot(nextTheme, nextStyle);
      if (stored.colorMode && stored.colorMode !== colorMode) {
        setTheme(stored.colorMode);
      }
      writeCookie({
        colorTheme: nextTheme,
        uiStyle: nextStyle,
        colorMode: nextMode,
      });
    } else {
      // (3) NEW ACCOUNT: no stored appearance — persist the current local
      // preference so this account inherits it and stays in sync going
      // forward. Fire-and-forget.
      void service
        .updatePreferences({
          appearance: { colorTheme, uiStyle, colorMode },
        } as Partial<UserPreferences>)
        .catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("appearance seed failed", err);
          }
        });
    }
    // Intentionally excluding local `colorTheme` / `uiStyle` / `colorMode`
    // from deps — this effect fires once per user login, not per local
    // change made after sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, setTheme]);

  const value = React.useMemo<AppearanceContextValue>(
    () => ({
      appearance: { colorTheme, uiStyle, colorMode },
      setColorTheme,
      setUIStyle,
      setColorMode,
    }),
    [colorTheme, uiStyle, colorMode, setColorTheme, setUIStyle, setColorMode],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = React.useContext(AppearanceContext);
  if (!ctx) {
    // Fallback so tests / stories that render outside the provider still work.
    return {
      appearance: DEFAULT_APPEARANCE,
      setColorTheme: () => undefined,
      setUIStyle: () => undefined,
      setColorMode: () => undefined,
    };
  }
  return ctx;
}
