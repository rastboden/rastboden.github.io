import { db, newId, type Child } from './schema'

export interface ChildInput {
  firstName: string
  lastName: string
  className: string
}

export async function createChild(input: ChildInput, now: number = Date.now()): Promise<Child> {
  const child: Child = { id: newId(), ...input, createdAt: now, archivedAt: null }
  await db.children.add(child)
  return child
}

/** Adds many children at once, all or none. Used by the class list import. */
export async function createChildren(inputs: ChildInput[], now: number = Date.now()): Promise<void> {
  const children: Child[] = inputs.map((input) => ({
    id: newId(),
    ...input,
    createdAt: now,
    archivedAt: null,
  }))
  await db.transaction('rw', db.children, () => db.children.bulkAdd(children))
}

export async function updateChild(id: string, input: ChildInput): Promise<void> {
  await db.children.update(id, input)
}

export async function archiveChild(id: string, now: number = Date.now()): Promise<void> {
  await db.children.update(id, { archivedAt: now })
}

/** Children that are in use, sorted by class and then name. */
export async function listChildren(): Promise<Child[]> {
  const children = await db.children.filter((child) => child.archivedAt === null).toArray()
  return children.sort(
    (a, b) =>
      a.className.localeCompare(b.className, 'sv', { numeric: true }) ||
      a.firstName.localeCompare(b.firstName, 'sv') ||
      a.lastName.localeCompare(b.lastName, 'sv'),
  )
}

/** Full name as shown in lists; the last name is optional. */
export function childName(child: Pick<Child, 'firstName' | 'lastName'>): string {
  return `${child.firstName} ${child.lastName}`.trim()
}
