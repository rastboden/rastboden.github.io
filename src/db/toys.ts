import { db, newId, type Toy } from './schema'

export interface ToyInput {
  name: string
  note: string
}

/** What to do with the toy's image when saving. */
export type ImageChange =
  | { kind: 'unchanged' }
  | { kind: 'replace'; blob: Blob }
  | { kind: 'remove' }

async function applyImageChange(toyId: string, change: ImageChange): Promise<void> {
  if (change.kind === 'replace') {
    await db.toyImages.put({ toyId, blob: change.blob })
  } else if (change.kind === 'remove') {
    await db.toyImages.delete(toyId)
  }
}

export async function createToy(
  input: ToyInput,
  image: ImageChange = { kind: 'unchanged' },
  now: number = Date.now(),
): Promise<Toy> {
  const toy: Toy = { id: newId(), ...input, createdAt: now, archivedAt: null }
  await db.transaction('rw', db.toys, db.toyImages, async () => {
    await db.toys.add(toy)
    await applyImageChange(toy.id, image)
  })
  return toy
}

export async function updateToy(
  id: string,
  input: ToyInput,
  image: ImageChange = { kind: 'unchanged' },
): Promise<void> {
  await db.transaction('rw', db.toys, db.toyImages, async () => {
    await db.toys.update(id, input)
    await applyImageChange(id, image)
  })
}

export async function archiveToy(id: string, now: number = Date.now()): Promise<void> {
  await db.toys.update(id, { archivedAt: now })
}

/** Toys that are in use, sorted by name. */
export async function listToys(): Promise<Toy[]> {
  const toys = await db.toys.filter((toy) => toy.archivedAt === null).toArray()
  return toys.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}

/** Every toy, archived ones included. For history and statistics. */
export function listAllToys(): Promise<Toy[]> {
  return db.toys.toArray()
}
