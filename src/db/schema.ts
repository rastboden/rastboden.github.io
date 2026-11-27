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

/** One kind of toy on a loan, and how many of it. */
export interface LoanItem {
  toyId: string
  quantity: number
  /** `null` while these are still out. */
  returnedAt: number | null
}

/**
 * Everything one child borrows at one time. A loan is never deleted when the
 * toys come back; `returnedAt` is set on its items instead. The full history
 * is what the statistics are built from.
 *
 * When only some of an item comes back, the item is split in two: the part
 * that is back and the part still out. So a toy can appear on more than one
 * item, but never twice with the same `returnedAt`.
 */
export interface Loan {
  id: string
  childId: string
  lentAt: number
  items: LoanItem[]
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
    // Version 3: a loan holds a list of items, each a toy and how many, instead
    // of exactly one toy. Loans no longer have a time limit or a note; both are
    // removed. Loans are not looked up by toy, so that index goes too.
    this.version(3)
      .stores({ loans: 'id, childId, lentAt' })
      .upgrade((transaction) =>
        transaction
          .table('loans')
          .toCollection()
          .modify((loan) => {
            loan.items = [{ toyId: loan.toyId, quantity: 1, returnedAt: loan.returnedAt }]
            delete loan.toyId
            delete loan.returnedAt
            delete loan.dueAt
            delete loan.note
          }),
      )
  }
}

export const db = new AppDb()

export function newId(): string {
  return crypto.randomUUID()
}
