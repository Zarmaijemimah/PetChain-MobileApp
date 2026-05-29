import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  en: { translation: en },
  es: { translation: es },
};

/** Resolve the best supported locale from the device locale list */
function resolveLocale(): SupportedLocale {
  const deviceLocales = Localization.getLocales?.() ?? [];
  for (const { languageCode } of deviceLocales) {
    const code = languageCode?.split('-')[0] as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(code)) return code;
  }
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveLocale(),
    fallbackLng: 'en',
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // Surface missing keys in dev so they're caught early
    saveMissing: __DEV__,
    missingKeyHandler: __DEV__
      ? (lngs, ns, key) => {
          console.warn(`[i18n] Missing key: ${ns}:${key} for locales: ${lngs.join(', ')}`);
        }
      : undefined,
  });

export default i18n;
