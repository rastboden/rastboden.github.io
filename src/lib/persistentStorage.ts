/**
 * Whether the browser has promised to keep the app's data. Without that
 * promise it may clear the data by itself, for example when the device runs
 * low on space. `unknown` means the browser cannot tell us.
 */
export type StorageProtection = 'protected' | 'unprotected' | 'unknown'

let request: Promise<StorageProtection> | undefined

async function ask(): Promise<StorageProtection> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') {
    return 'unknown'
  }
  try {
    if (await navigator.storage.persisted()) {
      return 'protected'
    }
    return (await navigator.storage.persist()) ? 'protected' : 'unprotected'
  } catch {
    return 'unknown'
  }
}

/**
 * Asks the browser to keep the data, and reports the answer. Asked once per
 * start of the app: most browsers decide silently (and tend to say yes once
 * the app is installed on the home screen), a few ask the user.
 *
 * A yes only stops the browser from clearing the data on its own. It does not
 * help if the device is lost or the app is removed; that is what backups are for.
 */
export function requestPersistentStorage(): Promise<StorageProtection> {
  request ??= ask()
  return request
}
