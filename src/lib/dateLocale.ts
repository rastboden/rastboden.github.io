/**
 * The locale to format dates with for an app language. English follows
 * day-before-month and the 24-hour clock like Swedish does; plain "en" would
 * give US dates.
 */
export function dateLocale(language: string | undefined): string {
  return language === 'en' ? 'en-GB' : 'sv-SE'
}
