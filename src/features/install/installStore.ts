import { useSyncExternalStore } from 'react'
import { isIos } from './platform'

/**
 * What the app can offer about installing itself right now:
 * - `installed`: already running as an installed app.
 * - `promptable`: the browser can show its own install dialog (Android, desktop Chrome/Edge).
 * - `ios`: iPhone or iPad, where the user has to add it from the share menu by hand.
 * - `unavailable`: the browser has not offered installing; only general advice can be given.
 */
export type InstallState = 'installed' | 'promptable' | 'ios' | 'unavailable'

/** Chromium's offer to install the app. It is not part of TypeScript's DOM types. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function'
}

const standaloneQuery = window.matchMedia('(display-mode: standalone)')

function isStandalone(): boolean {
  // `navigator.standalone` is Safari's own flag for an app opened from the home screen.
  return standaloneQuery.matches || ('standalone' in navigator && navigator.standalone === true)
}

let pendingPrompt: InstallPromptEvent | null = null
let installedThisVisit = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

// These are registered when the app starts, not from a component: the browser
// fires its install offer once, early, and it would be missed otherwise.
window.addEventListener('beforeinstallprompt', (event) => {
  if (!isInstallPromptEvent(event)) {
    return
  }
  // Stops Chrome's own small banner; the app shows its own instead.
  event.preventDefault()
  pendingPrompt = event
  notify()
})

window.addEventListener('appinstalled', () => {
  pendingPrompt = null
  installedThisVisit = true
  notify()
})

standaloneQuery.addEventListener('change', notify)

function getInstallState(): InstallState {
  if (installedThisVisit || isStandalone()) {
    return 'installed'
  }
  if (pendingPrompt) {
    return 'promptable'
  }
  if (isIos(navigator.userAgent, navigator.maxTouchPoints)) {
    return 'ios'
  }
  return 'unavailable'
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getInstallState)
}

/** Opens the browser's install dialog. Does nothing unless the state is `promptable`. */
export async function promptInstall(): Promise<void> {
  const prompt = pendingPrompt
  if (!prompt) {
    return
  }
  // The browser only lets an offer be used once.
  pendingPrompt = null
  notify()
  await prompt.prompt()
}
