import type messages from './messages/ko.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: import('./i18n/routing').Locale
    Messages: typeof messages
  }
}
