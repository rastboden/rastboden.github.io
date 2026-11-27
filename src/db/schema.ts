import Dexie, { type EntityTable } from 'dexie'

/** One physical toy that can be lent out. */
export interface Toy {
  id: string
  name: string
  category: string
  note: string
  createdAt: number
  /** Archived toys are hidden from lists but kept so loan history stays readable. */
  archivedAt: number | null
}

/** Kept in its own table so listing toys never loads image data. */
export interface ToyImage {
  toyId: string
  blob: Blob
}

export interface Child {
  id: string
  firstName: string
  lastName: string
  className: string
  createdAt: number
  archivedAt: number | null
}

/**
 * A loan is never deleted when the toy comes back; `returnedAt` is set instead.
 * The full history is what the statistics are built from.
 */
export interface Loan {
  id: string
  toyId: string
  childId: string
  lentAt: number
  dueAt: number | null
  returnedAt: number | null
  note: string
}

export class AppDb extends Dexie {
  declare toys: EntityTable<Toy, 'id'>
  declare toyImages: EntityTable<ToyImage, 'toyId'>
  declare children: EntityTable<Child, 'id'>
  declare loans: EntityTable<Loan, 'id'>

  constructor() {
    super('school-deposit-tool')
    this.version(1).stores({
      toys: 'id, name',
      toyImages: 'toyId',
      children: 'id, className',
      loans: 'id, toyId, childId, lentAt',
    })
  }
}

export const db = new AppDb()

export function newId(): string {
  return crypto.randomUUID()
}
