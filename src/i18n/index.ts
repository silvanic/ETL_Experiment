import { createI18n } from 'vue-i18n'
import messages from '@/i18n/messages.json'

export type AppLocale = 'fr' | 'en'

const LOCALE_STORAGE_KEY = 'etl-experiment.locale'
const FALLBACK_LOCALE: AppLocale = 'fr'

function getInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return FALLBACK_LOCALE
  }

  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return saved === 'fr' || saved === 'en' ? saved : FALLBACK_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  messages,
})

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
}

export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.global.t(key, params ?? {}) as string
}
