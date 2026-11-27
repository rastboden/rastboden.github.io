import Dexie, { type EntityTable } from 'dexie'

/**
 * A kind of toy that can be lent out, e.g. "Fotboll". It is not one item:
 * any number of children can have it on loan at the same time.
 */
export interface Toy {
  id: string
  name: string
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
    // Version 2: toys no longer have a category. The tables are the same; the
    // old value is removed from every toy so stored rows match the Toy type.
    this.version(2).upgrade((transaction) =>
      transaction
        .table('toys')
        .toCollection()
        .modify((toy) => {
          delete toy.category
        }),
    )
  }
}

export const db = new AppDb()

export function newId(): string {
  return crypto.randomUUID()
}
