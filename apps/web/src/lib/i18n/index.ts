'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en } from './translations/en';
import type { Locale } from './config';
import { DEFAULT_LOCALE, getLocaleDir } from './config';

type Translations = typeof en;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface I18nStore {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  translations: Translations;
  setLocale: (locale: Locale) => void;
}

const translationCache = new Map<string, Translations>();
translationCache.set('en', en);

async function loadTranslations(locale: Locale): Promise<Translations> {
  if (translationCache.has(locale)) return translationCache.get(locale)!;

  try {
    const mod = await import(`./translations/${locale}.ts`);
    const translations = { ...en, ...(mod[locale] || {}) };
    translationCache.set(locale, translations);
    return translations;
  } catch {
    return en;
  }
}

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      dir: 'ltr',
      translations: en,
      setLocale: async (locale: Locale) => {
        const translations = await loadTranslations(locale);
        const dir = getLocaleDir(locale);

        // Update HTML dir attribute
        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          document.documentElement.lang = locale;
        }

        set({ locale, dir, translations });
      },
    }),
    { name: 'lms-i18n', partialize: (s) => ({ locale: s.locale }) },
  ),
);

// t() helper — supports nested keys and interpolation
export function t(translations: Translations, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split('.');
  let value: any = translations;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return key;
  }

  if (typeof value !== 'string') return key;

  if (vars) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
  }

  return value;
}

// React hook for translation
export function useTranslation() {
  const { translations, locale, dir } = useI18n();
  return {
    t: (key: string, vars?: Record<string, string | number>) => t(translations, key, vars),
    locale,
    dir,
  };
}
