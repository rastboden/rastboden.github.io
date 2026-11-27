/**
 * When the last backup was saved on this device. Kept outside the database on
 * purpose: restoring a backup replaces the database, and must not bring back
 * an old answer to "when did this device last save a backup?".
 */
const STORAGE_KEY = 'lastBackupAt'

// Storage can be unavailable (e.g. private browsing); the time is then only
// remembered until the app is closed.
function readStored(): number | null {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0 ? stored : null
  } catch {
    return null
  }
}

let lastBackupAt = readStored()
const listeners = new Set<() => void>()

export function getLastBackupAt(): number | null {
  return lastBackupAt
}

export function recordBackup(at: number): void {
  lastBackupAt = at
  try {
    localStorage.setItem(STORAGE_KEY, String(at))
  } catch {
    // See readStored.
  }
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: screens showing the time update when a backup is saved. */
export function subscribeToLastBackup(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
