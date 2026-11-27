import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'

beforeEach(async () => {
  await db.delete()
})

/**
 * Devices in use hold data written by earlier versions of the app. Each block
 * below writes a database exactly as an old version laid it out, then opens it
 * with today's schema and checks that nothing was lost.
 *
 * The old layouts are written out here on purpose and must never be edited:
 * they are a record of what is on real devices. When `schema.ts` gets a new
 * version, add a block for the version before it.
 */
describe('opening a database from an earlier version', () => {
  it('keeps everything written by version 1', async () => {
    const toy = {
      id: 'toy-1',
      name: 'Boll',
      category: 'Ute',
      note: '',
      createdAt: 1000,
      archivedAt: null,
    }
    const child = {
      id: 'child-1',
      firstName: 'Anna',
      lastName: 'Ek',
      className: '2A',
      createdAt: 1000,
      archivedAt: 5000,
    }
    const loan = {
      id: 'loan-1',
      toyId: 'toy-1',
      childId: 'child-1',
      lentAt: 2000,
      dueAt: null,
      returnedAt: 3000,
      note: 'Rast',
    }
    const imageBytes = new Uint8Array([1, 2, 3])

    const version1 = new Dexie(db.name)
    version1.version(1).stores({
      toys: 'id, name',
      toyImages: 'toyId',
      children: 'id, className',
      loans: 'id, toyId, childId, lentAt',
    })
    await version1.table('toys').add(toy)
    await version1.table('children').add(child)
    await version1.table('loans').add(loan)
    await version1
      .table('toyImages')
      .add({ toyId: toy.id, blob: new Blob([imageBytes], { type: 'image/jpeg' }) })
    version1.close()

    await db.open()

    expect(await db.toys.toArray()).toMatchObject([toy])
    expect(await db.children.toArray()).toMatchObject([child])
    expect(await db.loans.toArray()).toMatchObject([loan])
    const image = await db.toyImages.get(toy.id)
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(imageBytes)
  })
})
