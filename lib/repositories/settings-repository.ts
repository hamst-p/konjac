import { DEFAULT_AI_SETTINGS, DEFAULT_UI_LOCALE, type AiSettings, type UiLocale } from "../types";

const SETTINGS_KEY = "konjac.ai-settings.v1";
const UI_LOCALE_KEY = "konjac.ui-locale.v1";

export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_AI_SETTINGS;

  try {
    return { ...DEFAULT_AI_SETTINGS, ...(JSON.parse(raw) as Partial<AiSettings>) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadUiLocale(): UiLocale {
  if (typeof window === "undefined") return DEFAULT_UI_LOCALE;
  const raw = window.localStorage.getItem(UI_LOCALE_KEY);
  return raw === "en" || raw === "ja" ? raw : DEFAULT_UI_LOCALE;
}

export function saveUiLocale(locale: UiLocale) {
  window.localStorage.setItem(UI_LOCALE_KEY, locale);
}

