import 'i18next'
import type { Translation } from './locales/sv'

// Makes translation keys type-checked: t('toys.nmae') is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: Translation
    }
  }
}
