import { z } from 'zod'
import { db } from './schema'

/**
 * A backup is one JSON file holding every table. Images are stored as base64
 * text, since JSON cannot hold binary data.
 *
 * When the tables change, raise BACKUP_VERSION and teach `parseBackup` to
 * read the older versions too: a backup taken last term must still restore.
 */
const BACKUP_FORMAT = 'school-deposit-tool-backup'
/**
 * Version 1: the first format.
 * Version 2: toys no longer have `category`. A version 1 file still reads:
 * the field is simply left out, since fields the schema does not name are dropped.
 */
const BACKUP_VERSION = 2

const toySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  note: z.string(),
  createdAt: z.number(),
  archivedAt: z.number().nullable(),
})

const childSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  className: z.string(),
  createdAt: z.number(),
  archivedAt: z.number().nullable(),
})

const loanSchema = z.object({
  id: z.string().min(1),
  toyId: z.string(),
  childId: z.string(),
  lentAt: z.number(),
  dueAt: z.number().nullable(),
  returnedAt: z.number().nullable(),
  note: z.string(),
})

const toyImageSchema = z.object({
  toyId: z.string().min(1),
  /** MIME type of the image, e.g. image/jpeg. */
  type: z.string(),
  /** The image bytes as base64. */
  data: z.base64(),
})

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  // Every version this app can read; newer ones are turned away before this point.
  version: z.union([z.literal(1), z.literal(BACKUP_VERSION)]),
  createdAt: z.number(),
  toys: z.array(toySchema),
  children: z.array(childSchema),
  loans: z.array(loanSchema),
  toyImages: z.array(toyImageSchema),
})

export type Backup = z.infer<typeof backupSchema>

/** Why a chosen file could not be used as a backup. */
export type BackupReadProblem =
  /** Not a backup from this app, or a damaged one. */
  | 'notBackup'
  /** Made by a newer version of the app than the one running. */
  | 'newerVersion'

export class BackupReadError extends Error {
  readonly problem: BackupReadProblem

  constructor(problem: BackupReadProblem) {
    super(`The file cannot be used as a backup: ${problem}`)
    this.name = 'BackupReadError'
    this.problem = problem
  }
}

// Built in pieces: spreading a whole image into String.fromCharCode overflows the call stack.
const BASE64_CHUNK_BYTES = 0x8000

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK_BYTES))
  }
  return btoa(binary)
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type })
}

/** Everything in the app, archived rows and loan history included. */
export async function createBackup(now: number = Date.now()): Promise<Backup> {
  // One transaction, so the tables are read at the same moment and agree with each other.
  const [toys, children, loans, images] = await db.transaction(
    'r',
    [db.toys, db.children, db.loans, db.toyImages],
    () =>
      Promise.all([
        db.toys.toArray(),
        db.children.toArray(),
        db.loans.toArray(),
        db.toyImages.toArray(),
      ]),
  )
  const toyImages = await Promise.all(
    images.map(async ({ toyId, blob }) => ({
      toyId,
      type: blob.type,
      data: await blobToBase64(blob),
    })),
  )
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now,
    toys,
    children,
    loans,
    toyImages,
  }
}

/** File name with the local date, e.g. rastboden-2026-11-27.json. */
export function backupFileName(createdAt: number): string {
  const date = new Date(createdAt)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `rastboden-${date.getFullYear()}-${month}-${day}.json`
}

/**
 * Reads the text of a backup file. Checked strictly, because restoring
 * replaces everything on the device: a file that is not a whole, valid
 * backup must be turned away before anything is touched.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupReadError('notBackup')
  }

  const header = z.object({ format: z.literal(BACKUP_FORMAT), version: z.number() }).safeParse(raw)
  if (!header.success) {
    throw new BackupReadError('notBackup')
  }
  if (header.data.version > BACKUP_VERSION) {
    throw new BackupReadError('newerVersion')
  }

  const backup = backupSchema.safeParse(raw)
  if (!backup.success) {
    throw new BackupReadError('notBackup')
  }
  return backup.data
}

/**
 * Replaces everything in the app with the backup. All or nothing: if any part
 * fails, the transaction is rolled back and the data from before is kept.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  // Converted first: nothing but database work may happen inside the transaction.
  const images = backup.toyImages.map(({ toyId, type, data }) => ({
    toyId,
    blob: base64ToBlob(data, type),
  }))

  await db.transaction('rw', [db.toys, db.children, db.loans, db.toyImages], async () => {
    await Promise.all([
      db.toys.clear(),
      db.children.clear(),
      db.loans.clear(),
      db.toyImages.clear(),
    ])
    await Promise.all([
      db.toys.bulkAdd(backup.toys),
      db.children.bulkAdd(backup.children),
      db.loans.bulkAdd(backup.loans),
      db.toyImages.bulkAdd(images),
    ])
  })
}
