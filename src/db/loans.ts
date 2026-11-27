import { db, newId, type Child, type Loan, type Toy } from './schema'

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

/**
 * Lends a toy to a child. A toy stands for a kind of thing, not one item, so
 * the same toy can be out with any number of children at the same time.
 */
export async function lendToy(input: LoanInput, now: number = Date.now()): Promise<Loan> {
  const loan: Loan = { id: newId(), ...input, lentAt: now, returnedAt: null }
  await db.loans.add(loan)
  return loan
}

/** Marks a loan as returned. Returning it a second time keeps the first time. */
export async function returnLoan(id: string, now: number = Date.now()): Promise<void> {
  await db.loans
    .where('id')
    .equals(id)
    .and((loan) => loan.returnedAt === null)
    .modify({ returnedAt: now })
}

/** Puts a returned loan back as active, for when "return" was tapped by mistake. */
export async function undoReturn(id: string): Promise<void> {
  await db.loans.update(id, { returnedAt: null })
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

/** Every loan a child has had, returned or not, newest first, with the toy looked up. */
export async function listLoansForChild(
  childId: string,
): Promise<{ loan: Loan; toy: Toy | undefined }[]> {
  const loans = await db.loans.where('childId').equals(childId).toArray()
  loans.sort((a, b) => b.lentAt - a.lentAt)
  const toys = await db.toys.bulkGet(loans.map((loan) => loan.toyId))
  return loans.map((loan, index) => ({ loan, toy: toys[index] }))
}

/** Every loan, returned or not, lent at or after the given time. */
export function listLoansSince(from: number): Promise<Loan[]> {
  return db.loans.where('lentAt').aboveOrEqual(from).toArray()
}
