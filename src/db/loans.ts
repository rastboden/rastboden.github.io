import { db, newId, type Child, type Loan, type LoanItem, type Toy } from './schema'

/** A toy and how many of it. */
export interface LoanLine {
  toyId: string
  quantity: number
}

export interface LoanInput {
  childId: string
  /** One line per toy, each with a quantity of at least one. */
  lines: LoanLine[]
}

/** A line with its toy looked up. The toy is missing only if the data is damaged. */
export interface LoanLineDetails extends LoanLine {
  toy: Toy | undefined
}

/** An active loan with the child, and what is still out. */
export interface LoanDetails {
  loan: Loan
  child: Child | undefined
  outstanding: LoanLineDetails[]
}

/** One row of a child's loan history: some of one toy, lent and perhaps returned. */
export interface ChildLoanLine extends LoanLineDetails {
  loanId: string
  lentAt: number
  returnedAt: number | null
}

/** A loan is active while anything on it is still out. */
export function isActive(loan: Loan): boolean {
  return loan.items.some((item) => item.returnedAt === null)
}

/** What is still out on a loan, one line per toy. */
export function outstandingLines(loan: Loan): LoanLine[] {
  return loan.items
    .filter((item) => item.returnedAt === null)
    .map(({ toyId, quantity }) => ({ toyId, quantity }))
}

/** How many things the lines add up to. */
export function totalQuantity(lines: { quantity: number }[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

/** Joins items of the same toy with the same return time, keeping the order they first appear in. */
function mergeItems(items: LoanItem[]): LoanItem[] {
  const merged: LoanItem[] = []
  for (const item of items) {
    const same = merged.find(
      (other) => other.toyId === item.toyId && other.returnedAt === item.returnedAt,
    )
    if (same) {
      same.quantity += item.quantity
    } else {
      merged.push({ ...item })
    }
  }
  return merged
}

/**
 * Lends toys to a child as one loan. A toy stands for a kind of thing, not one
 * item, so the same toy can be out with any number of children at the same
 * time, and one child can borrow several of it.
 */
export async function lendToys(input: LoanInput, now: number = Date.now()): Promise<Loan> {
  const items = mergeItems(
    input.lines
      .filter((line) => line.quantity > 0)
      .map(({ toyId, quantity }) => ({ toyId, quantity, returnedAt: null })),
  )
  if (items.length === 0) {
    throw new Error('A loan needs at least one toy.')
  }
  const loan: Loan = { id: newId(), childId: input.childId, lentAt: now, items }
  await db.loans.add(loan)
  return loan
}

/**
 * Marks things on a loan as returned. Without `lines`, everything still out
 * comes back. With `lines`, only that many of those toys do, and the rest of
 * the loan stays out. Things that are already back keep their return time.
 */
export async function returnLoan(
  id: string,
  now: number = Date.now(),
  lines?: LoanLine[],
): Promise<void> {
  await db.transaction('rw', db.loans, async () => {
    const loan = await db.loans.get(id)
    if (!loan) {
      return
    }
    // How many of each toy are still to be taken off the loan; `undefined` means all.
    const toReturn = lines && new Map(lines.map((line) => [line.toyId, line.quantity]))
    const items: LoanItem[] = []
    for (const item of loan.items) {
      const wanted = toReturn ? (toReturn.get(item.toyId) ?? 0) : item.quantity
      const back = item.returnedAt === null ? Math.min(item.quantity, Math.max(0, wanted)) : 0
      if (back > 0) {
        items.push({ ...item, quantity: back, returnedAt: now })
        toReturn?.set(item.toyId, wanted - back)
      }
      if (back < item.quantity) {
        items.push({ ...item, quantity: item.quantity - back })
      }
    }
    await db.loans.update(id, { items: mergeItems(items) })
  })
}

/**
 * Puts back as active what was returned at the given time, for when "return"
 * was tapped by mistake. Earlier returns on the same loan are left alone.
 */
export async function undoReturn(id: string, returnedAt: number): Promise<void> {
  await db.transaction('rw', db.loans, async () => {
    const loan = await db.loans.get(id)
    if (!loan) {
      return
    }
    const items = loan.items.map((item) =>
      item.returnedAt === returnedAt ? { ...item, returnedAt: null } : item,
    )
    await db.loans.update(id, { items: mergeItems(items) })
  })
}

/** Loans with something still out, oldest first. */
export async function listActiveLoans(): Promise<Loan[]> {
  const loans = await db.loans.filter(isActive).toArray()
  return loans.sort((a, b) => a.lentAt - b.lentAt)
}

/** Looks up every toy the loans mention, by id. */
async function toysOnLoans(loans: Loan[]): Promise<Map<string, Toy>> {
  const ids = [...new Set(loans.flatMap((loan) => loan.items.map((item) => item.toyId)))]
  const toys = await db.toys.bulkGet(ids)
  return new Map(toys.flatMap((toy) => (toy ? [[toy.id, toy] as const] : [])))
}

/** Active loans with the child and the toys still out looked up, oldest first. */
export async function listActiveLoanDetails(): Promise<LoanDetails[]> {
  const loans = await listActiveLoans()
  const children = await db.children.bulkGet(loans.map((loan) => loan.childId))
  const toys = await toysOnLoans(loans)
  return loans.map((loan, index) => ({
    loan,
    child: children[index],
    outstanding: outstandingLines(loan).map((line) => ({ ...line, toy: toys.get(line.toyId) })),
  }))
}

/**
 * Everything a child has borrowed, returned or not, newest loan first. One row
 * per item, so a loan of two toys gives two rows.
 */
export async function listLoanLinesForChild(childId: string): Promise<ChildLoanLine[]> {
  const loans = await db.loans.where('childId').equals(childId).toArray()
  loans.sort((a, b) => b.lentAt - a.lentAt)
  const toys = await toysOnLoans(loans)
  return loans.flatMap((loan) =>
    loan.items.map((item) => ({
      loanId: loan.id,
      lentAt: loan.lentAt,
      toyId: item.toyId,
      toy: toys.get(item.toyId),
      quantity: item.quantity,
      returnedAt: item.returnedAt,
    })),
  )
}

/** Every loan, returned or not, lent at or after the given time. */
export function listLoansSince(from: number): Promise<Loan[]> {
  return db.loans.where('lentAt').aboveOrEqual(from).toArray()
}
