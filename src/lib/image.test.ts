import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('scales a landscape photo down by its longest side', () => {
    expect(fitWithin(4000, 3000, 512)).toEqual({ width: 512, height: 384 })
  })

  it('scales a portrait photo down by its longest side', () => {
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512 })
  })

  it('leaves an image that already fits untouched', () => {
    expect(fitWithin(300, 200, 512)).toEqual({ width: 300, height: 200 })
  })

  it('never produces a zero-sized side for extreme proportions', () => {
    expect(fitWithin(10000, 2, 512)).toEqual({ width: 512, height: 1 })
  })
})
