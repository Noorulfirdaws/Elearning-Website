export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'es', name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', dir: 'ltr', flag: '🇧🇷' },
  { code: 'zh', name: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', dir: 'ltr', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', dir: 'ltr', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
] as const;

export type Locale = typeof SUPPORTED_LOCALES[number]['code'];
export const DEFAULT_LOCALE: Locale = 'en';

export function isRtl(locale: Locale): boolean {
  return SUPPORTED_LOCALES.find(l => l.code === locale)?.dir === 'rtl';
}

export function getLocaleDir(locale: Locale): 'ltr' | 'rtl' {
  return SUPPORTED_LOCALES.find(l => l.code === locale)?.dir as 'ltr' | 'rtl' || 'ltr';
}
