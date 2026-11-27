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

    // Version 2 removes the category on purpose; everything else about the toy is kept.
    const { category: _category, ...toyWithoutCategory } = toy
    expect(await db.toys.toArray()).toEqual([toyWithoutCategory])
    expect(await db.children.toArray()).toMatchObject([child])
    // Version 3 turns the loan into one with a single item, and removes the time limit and note on purpose.
    expect(await db.loans.toArray()).toEqual([
      {
        id: 'loan-1',
        childId: 'child-1',
        lentAt: 2000,
        items: [{ toyId: 'toy-1', quantity: 1, returnedAt: 3000 }],
      },
    ])
    const image = await db.toyImages.get(toy.id)
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(imageBytes)
  })

  it('keeps everything written by version 2, with each loan turned into a loan of one item', async () => {
    const toy = { id: 'toy-1', name: 'Boll', note: '', createdAt: 1000, archivedAt: null }
    const child = {
      id: 'child-1',
      firstName: 'Anna',
      lastName: 'Ek',
      className: '2A',
      createdAt: 1000,
      archivedAt: null,
    }
    const returnedLoan = {
      id: 'loan-1',
      toyId: 'toy-1',
      childId: 'child-1',
      lentAt: 2000,
      dueAt: null,
      returnedAt: 3000,
      note: '',
    }
    const activeLoan = {
      id: 'loan-2',
      toyId: 'toy-1',
      childId: 'child-1',
      lentAt: 4000,
      dueAt: 9000,
      returnedAt: null,
      note: 'Rast',
    }
    const imageBytes = new Uint8Array([1, 2, 3])

    const version2 = new Dexie(db.name)
    version2.version(2).stores({
      toys: 'id, name',
      toyImages: 'toyId',
      children: 'id, className',
      loans: 'id, toyId, childId, lentAt',
    })
    await version2.table('toys').add(toy)
    await version2.table('children').add(child)
    await version2.table('loans').bulkAdd([returnedLoan, activeLoan])
    await version2
      .table('toyImages')
      .add({ toyId: toy.id, blob: new Blob([imageBytes], { type: 'image/jpeg' }) })
    version2.close()

    await db.open()

    expect(await db.toys.toArray()).toEqual([toy])
    expect(await db.children.toArray()).toEqual([child])
    // The time limit and the note are removed on purpose: loans no longer have them.
    expect(await db.loans.orderBy('id').toArray()).toEqual([
      {
        id: 'loan-1',
        childId: 'child-1',
        lentAt: 2000,
        items: [{ toyId: 'toy-1', quantity: 1, returnedAt: 3000 }],
      },
      {
        id: 'loan-2',
        childId: 'child-1',
        lentAt: 4000,
        items: [{ toyId: 'toy-1', quantity: 1, returnedAt: null }],
      },
    ])
    // The loans can still be found by child and by time after the index change.
    expect(await db.loans.where('childId').equals('child-1').count()).toBe(2)
    expect(await db.loans.where('lentAt').aboveOrEqual(3000).count()).toBe(1)
    const image = await db.toyImages.get(toy.id)
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(imageBytes)
  })
})
