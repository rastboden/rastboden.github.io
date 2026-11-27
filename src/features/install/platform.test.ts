import { describe, expect, it } from 'vitest'
import { isIos } from './platform'

const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const mac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const android =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'

describe('isIos', () => {
  it('recognises an iPhone', () => {
    expect(isIos(iphone, 5)).toBe(true)
  })

  it('recognises an iPad, which presents itself as a Mac with a touch screen', () => {
    expect(isIos(mac, 5)).toBe(true)
  })

  it('does not take a real Mac for an iPad', () => {
    expect(isIos(mac, 0)).toBe(false)
  })

  it('does not take an Android phone for an iPhone', () => {
    expect(isIos(android, 5)).toBe(false)
  })
})
