import { db, newId, type Child, type Loan, type Toy } from './schema'
import { listToys } from './toys'

export interface LoanInput {
  toyId: string
  childId: string
  dueAt: number | null
  note: string
}

/** An active loan together with the toy and child it refers to. */
export interface LoanDetails {
  loan: Loan
  toy: Toy | undefined
  child: Child | undefined
}

export class ToyAlreadyLentError extends Error {
  constructor() {
    super('The toy is already lent out')
    this.name = 'ToyAlreadyLentError'
  }
}

function openLoanForToy(toyId: string): Promise<Loan | undefined> {
  return db.loans
    .where('toyId')
    .equals(toyId)
    .filter((loan) => loan.returnedAt === null)
    .first()
}

/** Lends a toy to a child. A toy can only be out on one loan at a time. */
export async function lendToy(input: LoanInput, now: number = Date.now()): Promise<Loan> {
  return db.transaction('rw', db.loans, async () => {
    if (await openLoanForToy(input.toyId)) {
      throw new ToyAlreadyLentError()
    }
    const loan: Loan = { id: newId(), ...input, lentAt: now, returnedAt: null }
    await db.loans.add(loan)
    return loan
  })
}

/** Marks a loan as returned. Returning it a second time keeps the first time. */
export async function returnLoan(id: string, now: number = Date.now()): Promise<void> {
  await db.loans
    .where('id')
    .equals(id)
    .and((loan) => loan.returnedAt === null)
    .modify({ returnedAt: now })
}

/**
 * Puts a returned loan back as active, for when "return" was tapped by mistake.
 * Refused if the toy has been lent to someone else in the meantime.
 */
export async function undoReturn(id: string): Promise<void> {
  await db.transaction('rw', db.loans, async () => {
    const loan = await db.loans.get(id)
    if (!loan || loan.returnedAt === null) {
      return
    }
    if (await openLoanForToy(loan.toyId)) {
      throw new ToyAlreadyLentError()
    }
    await db.loans.update(id, { returnedAt: null })
  })
}

/** Loans that are still out, oldest first. */
export async function listActiveLoans(): Promise<Loan[]> {
  const loans = await db.loans.filter((loan) => loan.returnedAt === null).toArray()
  return loans.sort((a, b) => a.lentAt - b.lentAt)
}

/** Active loans with their toy and child looked up, oldest first. */
export async function listActiveLoanDetails(): Promise<LoanDetails[]> {
  const loans = await listActiveLoans()
  const toys = await db.toys.bulkGet(loans.map((loan) => loan.toyId))
  const children = await db.children.bulkGet(loans.map((loan) => loan.childId))
  return loans.map((loan, index) => ({ loan, toy: toys[index], child: children[index] }))
}

/** Toys that are in use and not out on loan right now, sorted by name. */
export async function listAvailableToys(): Promise<Toy[]> {
  const toys = await listToys()
  const lentToyIds = new Set((await listActiveLoans()).map((loan) => loan.toyId))
  return toys.filter((toy) => !lentToyIds.has(toy.id))
}

/** Every loan, returned or not, lent at or after the given time. */
export function listLoansSince(from: number): Promise<Loan[]> {
  return db.loans.where('lentAt').aboveOrEqual(from).toArray()
}
