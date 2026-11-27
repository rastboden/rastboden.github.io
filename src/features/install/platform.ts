/**
 * Whether the device is an iPhone or iPad. iPadOS presents itself as a Mac,
 * so a "Mac" with a touch screen is taken to be an iPad.
 */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}
