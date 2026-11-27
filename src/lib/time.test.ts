import { describe, expect, it } from 'vitest'
import { splitDuration } from './time'

const seconds = (count: number) => count * 1000
const minutes = (count: number) => count * 60_000

describe('splitDuration', () => {
  it('rounds time passed down to whole minutes', () => {
    expect(splitDuration(minutes(12) + seconds(59))).toEqual({ hours: 0, minutes: 12 })
  })

  it('rounds time remaining up to whole minutes', () => {
    expect(splitDuration(minutes(2) + seconds(10), 'up')).toEqual({ hours: 0, minutes: 3 })
  })

  it('carries minutes over into hours', () => {
    expect(splitDuration(minutes(125))).toEqual({ hours: 2, minutes: 5 })
    expect(splitDuration(minutes(59) + seconds(1), 'up')).toEqual({ hours: 1, minutes: 0 })
  })

  it('treats a negative length as zero', () => {
    expect(splitDuration(-minutes(5))).toEqual({ hours: 0, minutes: 0 })
  })
})
