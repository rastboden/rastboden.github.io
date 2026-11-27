import { useEffect, useState } from 'react'

/**
 * The current time, refreshed on an interval and whenever the app comes back
 * to the foreground, so that "lent for 12 min" keeps counting on screen.
 */
export function useNow(intervalMs: number = 15_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [intervalMs])

  return now
}
