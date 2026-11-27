import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { sv } from './locales/sv'

/** Each language with the name shown in the language picker (always in its own language). */
export const languages = [
  { code: 'sv', label: 'Svenska' },
  { code: 'en', label: 'English' },
] as const

export type Language = (typeof languages)[number]['code']

const DEFAULT_LANGUAGE: Language = 'sv'
const STORAGE_KEY = 'language'

function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language.code === value)
}

// Storage can be unavailable (e.g. private browsing); the app then simply
// starts in the default language each time.
function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function storeLanguage(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // See readStoredLanguage.
  }
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  storeLanguage(language)
})

void i18n.use(initReactI18next).init({
  resources: {
    sv: { translation: sv },
    en: { translation: en },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
})

export default i18n
