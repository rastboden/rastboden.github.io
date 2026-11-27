import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import { db } from '@/db/schema'
import { getLastBackupAt, subscribeToLastBackup } from '@/lib/lastBackup'
import { useNow } from './useNow'

/** A backup older than this is due for a new one. */
export const BACKUP_REMINDER_DAYS = 7

const DAY = 24 * 60 * 60 * 1000
const CLOCK_INTERVAL_MS = 10 * 60 * 1000

async function hasAnyData(): Promise<boolean> {
  const counts = await Promise.all([db.toys.count(), db.children.count(), db.loans.count()])
  return counts.some((count) => count > 0)
}

/**
 * When the last backup was saved, and whether it is time for a new one: there
 * is something to lose, and no backup from the last week.
 */
export function useBackupStatus(): { lastBackupAt: number | null; isDue: boolean } {
  const lastBackupAt = useSyncExternalStore(subscribeToLastBackup, getLastBackupAt)
  const hasData = useLiveQuery(hasAnyData)
  const now = useNow(CLOCK_INTERVAL_MS)

  const isOld = lastBackupAt === null || now - lastBackupAt > BACKUP_REMINDER_DAYS * DAY
  return { lastBackupAt, isDue: hasData === true && isOld }
}
