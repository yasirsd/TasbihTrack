import {
  APPEARANCE_COOKIE,
  COLOR_MODES,
  COLOR_THEMES,
  DEFAULT_APPEARANCE,
  UI_STYLES,
  type Appearance,
} from "./types";

/**
 * A tiny script that runs BEFORE React hydrates. It re-reads the cookie
 * (so a stale server render doesn't override a same-tab appearance change
 * during a soft nav) and stamps `<html>` with:
 *   • data-color-theme
 *   • data-ui-style
 *   • class="dark" if color mode resolves to dark
 *
 * next-themes already handles the class toggle for `system`. This script
 * covers the initial paint case so a returning user with a saved Violet
 * Clay Dark preference never sees Original Standard Light flash.
 *
 * We take the server-parsed appearance as the initial (so SSR + client
 * agree). The script re-reads the cookie only to catch the case where a
 * user changed appearance in another tab.
 */
export function makePrepaintScript(initial: Appearance): string {
  const t = JSON.stringify(initial);
  const themes = JSON.stringify(COLOR_THEMES);
  const styles = JSON.stringify(UI_STYLES);
  const modes = JSON.stringify(COLOR_MODES);
  const cookieName = JSON.stringify(APPEARANCE_COOKIE);
  const defaults = JSON.stringify(DEFAULT_APPEARANCE);
  return `
(function(){try{
var el=document.documentElement;
var ct=${themes},us=${styles},cm=${modes},d=${defaults};
var m=(document.cookie.match(new RegExp('(?:^|; )'+${cookieName}+'=([^;]*)'))||[])[1];
var pref=${t};
if(m){var p=decodeURIComponent(m).split('|');
  if(ct.indexOf(p[0])>-1)pref.colorTheme=p[0];
  if(us.indexOf(p[1])>-1)pref.uiStyle=p[1];
  if(cm.indexOf(p[2])>-1)pref.colorMode=p[2];
}
el.setAttribute('data-color-theme',pref.colorTheme||d.colorTheme);
el.setAttribute('data-ui-style',pref.uiStyle||d.uiStyle);
var mode=pref.colorMode||d.colorMode;
var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(dark)el.classList.add('dark');else el.classList.remove('dark');
}catch(_){}})();`.trim();
}
